# 生产级别增强 (Production-Grade Enhancements)

本文档包含生产环境所需的增强配置。

---

## 1. 表分区策略

### 按月分区

```sql
-- 自动创建未来分区
CREATE OR REPLACE FUNCTION raw.create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..2 LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);
        partition_name := 'scan_results_' || TO_CHAR(partition_date, 'YYYY_MM');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'raw' AND tablename = partition_name
        ) THEN
            EXECUTE FORMAT(
                'CREATE TABLE raw.%I PARTITION OF raw.scan_results 
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, 
                partition_date, 
                partition_date + INTERVAL '1 month'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 数据归档

```sql
CREATE OR REPLACE FUNCTION raw.archive_old_data()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    WITH moved AS (
        DELETE FROM raw.scan_results
        WHERE scanned_at < CURRENT_DATE - INTERVAL '90 days'
        RETURNING *
    )
    INSERT INTO raw.scan_results_archive SELECT * FROM moved;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. 数据质量约束

### dbt Tests (models/staging/_stg_models.yml)

```yaml
version: 2

models:
  - name: stg_unique_businesses
    columns:
      - name: business_id
        tests:
          - unique
          - not_null
      - name: lat
        tests:
          - dbt_utils.accepted_range:
              min_value: -90
              max_value: 90

  - name: stg_rankings_flattened
    columns:
      - name: rank_position
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 1
              max_value: 20
      - name: scanned_at
        tests:
          - dbt_utils.recency:
              datepart: day
              field: scanned_at
              interval: 7
```

---

## 3. 监控与告警

### 健康检查函数

```sql
CREATE OR REPLACE FUNCTION monitoring.check_system_health()
RETURNS TABLE (check_name TEXT, status TEXT, details JSONB) AS $$
BEGIN
    -- 数据新鲜度
    RETURN QUERY
    SELECT 
        'data_freshness'::TEXT,
        CASE WHEN MAX(scanned_at) > NOW() - INTERVAL '6 hours' 
             THEN 'healthy' ELSE 'stale' END,
        jsonb_build_object('last_scan', MAX(scanned_at))
    FROM raw.scan_results;
    
    -- 热力图数据
    RETURN QUERY
    SELECT 
        'heatmap_data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'empty' END,
        jsonb_build_object('total_cells', COUNT(*))
    FROM public.mart_heatmap_snapshot;
END;
$$ LANGUAGE plpgsql;
```

### GitHub Actions

```yaml
name: dbt Production Pipeline

on:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  dbt-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dbt
        run: |
          pip install dbt-postgres
          cd dbt_project
          dbt run --target prod
          dbt test
```

---

## 4. 备份策略

### 关键表导出

```bash
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d)

psql $DATABASE_URL -c "\COPY public.mart_heatmap_snapshot TO 'backup_${BACKUP_DATE}.csv' CSV HEADER"

aws s3 cp "backup_${BACKUP_DATE}.csv" "s3://your-bucket/db-backups/"
```

### 恢复流程

1. 停止前端访问
2. 从备份恢复: `\COPY table FROM 'backup.csv' CSV HEADER`
3. 重新运行 dbt
4. 验证数据完整性

---

## 5. 生产就绪检查清单

```
□ 基础架构
  ✓ 三层数据架构
  ✓ 表分区策略
  ✓ 索引优化

□ 数据质量
  ✓ CHECK 约束
  ✓ dbt tests
  □ 异常值检测

□ 安全
  ✓ RLS 策略
  □ API Rate Limiting
  □ 审计日志

□ 可观测性
  ✓ 健康检查函数
  □ Slack 告警
  □ Grafana 仪表板

□ 灾难恢复
  ✓ 备份脚本
  □ 定期恢复演练
```
