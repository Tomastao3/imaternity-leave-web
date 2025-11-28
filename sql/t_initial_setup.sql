-- PostgreSQL initialization script for maternity allowance system
-- Drops existing tables (if any), recreates them, and seeds baseline data.

-- Drop tables in dependency order
DROP TABLE IF EXISTS t_holidays CASCADE;
DROP TABLE IF EXISTS t_refund_rules CASCADE;
DROP TABLE IF EXISTS t_employees CASCADE;
DROP TABLE IF EXISTS t_allowance_rules CASCADE;
DROP TABLE IF EXISTS t_maternity_rules CASCADE;

-- Table: t_maternity_rules
CREATE TABLE t_maternity_rules (
    id                SERIAL PRIMARY KEY,
    city              VARCHAR(50) NOT NULL,
    leave_type        VARCHAR(64) NOT NULL,
    miscarriage_type  VARCHAR(64),
    leave_days        INTEGER NOT NULL CHECK (leave_days > 0),
    is_extendable     BOOLEAN NOT NULL DEFAULT FALSE,
    has_allowance     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX idx_t_maternity_rules_unique ON t_maternity_rules (city, leave_type, COALESCE(miscarriage_type, ''));

-- Table: t_allowance_rules
CREATE TABLE t_allowance_rules (
    id                      SERIAL PRIMARY KEY,
    city                    VARCHAR(50) NOT NULL,
    social_average_wage     NUMERIC(12,2) NOT NULL,
    company_average_wage    NUMERIC(12,2) NOT NULL,
    company_contribution_wage NUMERIC(12,2) NOT NULL,
    calculation_base        VARCHAR(20) NOT NULL,
    payout_method           VARCHAR(20) NOT NULL,
    maternity_policy        TEXT,
    allowance_policy        TEXT
);

CREATE UNIQUE INDEX idx_t_allowance_rules_city ON t_allowance_rules (city);

-- Table: t_employees (员工信息表)
CREATE TABLE t_employees (
  id SERIAL PRIMARY KEY,
  employee_no VARCHAR(20) NOT NULL UNIQUE,
  employee_name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  personal_ss_monthly DECIMAL(12, 2) NOT NULL DEFAULT 0,
  employee_basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  employee_base_salary_current DECIMAL(12, 2) DEFAULT 0,
  is_difficult_birth BOOLEAN NOT NULL DEFAULT FALSE,
  number_of_babies INTEGER NOT NULL DEFAULT 1,
  pregnancy_period VARCHAR(32) NOT NULL
);

-- 添加索引
CREATE INDEX idx_employees_city ON t_employees(city);
CREATE INDEX idx_employees_no ON t_employees(employee_no);

-- 注释
COMMENT ON TABLE t_employees IS '员工信息表';
COMMENT ON COLUMN t_employees.employee_no IS '员工编号';
COMMENT ON COLUMN t_employees.employee_name IS '员工姓名';
COMMENT ON COLUMN t_employees.city IS '所在城市';
COMMENT ON COLUMN t_employees.personal_ss_monthly IS '月度个人部分社保公积金合计';
COMMENT ON COLUMN t_employees.employee_basic_salary IS '产前12月平均工资';
COMMENT ON COLUMN t_employees.employee_base_salary_current IS '基本工资';
COMMENT ON COLUMN t_employees.is_difficult_birth IS '是否难产';
COMMENT ON COLUMN t_employees.number_of_babies IS '胎数';
COMMENT ON COLUMN t_employees.pregnancy_period IS '怀孕时间段';

-- Table: t_refund_rules (返还规则表)
CREATE TABLE t_refund_rules (
  id SERIAL PRIMARY KEY,
  city VARCHAR(50) NOT NULL,
  start_month CHAR(7) NOT NULL,
  end_month CHAR(7) NOT NULL,
  refund_description TEXT,
  refund_amount NUMERIC(12, 2),
  direct_display BOOLEAN NOT NULL DEFAULT FALSE,
  single_month_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refund_rules_city ON t_refund_rules(city);

-- Table: t_holidays
CREATE TABLE t_holidays (
    id               SERIAL PRIMARY KEY,
    holiday_name     VARCHAR(100) NOT NULL,
    holiday_date     DATE NOT NULL,
    holiday_type     VARCHAR(20) NOT NULL DEFAULT 'holiday',
    is_legal_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_holiday_date UNIQUE (holiday_date)
);

-- Seed data for t_maternity_rules
INSERT INTO t_maternity_rules (city, leave_type, miscarriage_type, leave_days, is_extendable, has_allowance)
VALUES
    -- 上海
    ('上海', '法定产假', null, 98, FALSE, TRUE),
    ('上海', '难产假', null, 15, FALSE, TRUE),
    ('上海', '多胞胎', null, 15, FALSE, TRUE),
    ('上海', '晚育假/生育假/奖励假', null, 60, TRUE, TRUE),
    ('上海', '流产假', '妊娠未满4个月流产', 15, FALSE, TRUE),
    ('上海', '流产假', '妊娠满4个月流产', 42, FALSE, TRUE),

    -- 深圳
    ('深圳', '法定产假', null, 98, FALSE, TRUE),
    ('深圳', '难产假', null, 30, FALSE, TRUE),
    ('深圳', '多胞胎', null, 15, FALSE, TRUE),
    ('深圳', '晚育假/生育假/奖励假', null, 80, FALSE, FALSE),
    ('深圳', '流产假', '妊娠未满4个月流产', 15, FALSE, TRUE),
    ('深圳', '流产假', '妊娠满4个月流产', 42, FALSE, TRUE),
    ('深圳', '流产假', '妊娠满7个月流产', 75, FALSE, TRUE),

    -- 广州
    ('广州', '法定产假', null, 98, FALSE, TRUE),
    ('广州', '难产假', null, 15, FALSE, TRUE),
    ('广州', '难产假（剖腹产、会阴Ⅲ度破裂）', null, 30, FALSE, TRUE),
    ('广州', '多胞胎', null, 15, FALSE, TRUE),
    ('广州', '晚育假/生育假/奖励假', null, 80, FALSE, FALSE),
    ('广州', '流产假', '妊娠未满4个月流产', 15, FALSE, TRUE),
    ('广州', '流产假', '妊娠满4个月流产', 42, FALSE, TRUE),
    ('广州', '流产假', '妊娠满7个月流产', 75, FALSE, TRUE);

-- Seed data for t_allowance_rules
INSERT INTO t_allowance_rules (
    city,
    social_average_wage,
    company_average_wage,
    company_contribution_wage,
    calculation_base,
    payout_method,
    maternity_policy,
    allowance_policy
)
VALUES
    ('上海', 12307.00, 49000.00, 30000.00, '平均工资', '个人', '法定产假98天，企业账户发放相关政策', '汇至本人账户，上海市生育津贴政策'),
    ('深圳', 12297.00, 25000.00, 30000.00, '平均缴费工资', '企业', '法定产假98天，深圳生育津贴发放政策', '汇至企业账户，深圳市生育津贴政策');

-- Seed data for t_holidays
INSERT INTO t_holidays (holiday_name, holiday_date, holiday_type, is_legal_holiday)
VALUES
    ('元旦', '2025-01-01', 'holiday', TRUE),
    ('春节', '2025-02-10', 'holiday', TRUE),
    ('清明节调休', '2025-04-06', 'makeup', FALSE),
    ('劳动节调休', '2025-05-04', 'makeup', FALSE),
    ('端午节', '2025-06-10', 'holiday', TRUE),
    ('中秋节', '2025-09-15', 'holiday', TRUE),
    ('国庆节', '2025-10-01', 'holiday', TRUE),
    ('国庆节', '2025-10-02', 'holiday', TRUE),
    ('国庆节', '2025-10-03', 'holiday', TRUE),
    ('元旦', '2026-01-01', 'holiday', TRUE),
    ('春节', '2026-02-10', 'holiday', TRUE);

-- Seed data for t_refund_rules
INSERT INTO t_refund_rules (city, start_month, end_month, refund_description, refund_amount, direct_display, single_month_only)
VALUES
  ('通用', '2020-01', '2025-11', '发放Spot On', -100, TRUE, TRUE),
  ('通用', '2020-01', '2025-11', '月弹性福利自费', 300, TRUE, TRUE),
  ('通用', '2020-01', '2025-11', '月工会费', 50, FALSE, FALSE)
ON CONFLICT DO NOTHING;