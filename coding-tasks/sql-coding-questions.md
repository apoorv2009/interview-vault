# SQL Coding Practice — Interview Questions

> Schema: mix of Capital Access project tables + classic Employees/Orders tables.
> All queries written for **SQL Server** syntax.

---

## Setup — Sample Tables

```sql
-- Classic Employees table (used in Q1–Q12)
CREATE TABLE Employees (
    EmpId       INT PRIMARY KEY,
    Name        VARCHAR(100),
    Department  VARCHAR(50),
    Salary      DECIMAL(10,2),
    ManagerId   INT NULL,          -- self-referencing FK
    JoinDate    DATE
);

INSERT INTO Employees VALUES
(1,  'Alice',   'Engineering', 90000, NULL, '2020-01-15'),
(2,  'Bob',     'Engineering', 75000, 1,    '2021-03-10'),
(3,  'Carol',   'Engineering', 75000, 1,    '2021-06-01'),
(4,  'Dave',    'HR',          60000, NULL, '2019-07-20'),
(5,  'Eve',     'HR',          55000, 4,    '2022-02-14'),
(6,  'Frank',   'Finance',     80000, NULL, '2018-11-05'),
(7,  'Grace',   'Finance',     80000, 6,    '2020-09-30'),
(8,  'Hank',    'Engineering', 90000, 1,    '2020-01-15'),
(9,  'Ivy',     'HR',          NULL,  4,    '2023-04-01');

-- Capital Access: EngagementActivities (used in Q13–Q20)
CREATE TABLE EngagementActivities (
    Id          INT PRIMARY KEY,
    TenantId    INT,
    CompanyId   INT,
    Status      VARCHAR(20),   -- 'Scheduled','Completed','Cancelled'
    Type        VARCHAR(30),   -- 'Meeting','Call','Conference'
    AttendeeCount INT,
    ScheduledAt DATE,
    CreatedAt   DATETIME
);

INSERT INTO EngagementActivities VALUES
(1,  101, 1001, 'Completed',  'Meeting',    5,  '2024-01-10', '2024-01-01'),
(2,  101, 1001, 'Completed',  'Call',       3,  '2024-01-15', '2024-01-05'),
(3,  101, 1002, 'Scheduled',  'Meeting',    8,  '2024-02-20', '2024-01-20'),
(4,  101, 1001, 'Cancelled',  'Conference', 20, '2024-02-01', '2024-01-10'),
(5,  102, 1003, 'Completed',  'Call',       2,  '2024-01-05', '2023-12-20'),
(6,  102, 1003, 'Completed',  'Meeting',    6,  '2024-01-20', '2024-01-10'),
(7,  102, 1004, 'Scheduled',  'Call',       4,  '2024-03-01', '2024-02-01'),
(8,  101, 1001, 'Completed',  'Meeting',    5,  '2024-01-10', '2024-01-01'), -- duplicate of row 1
(9,  101, 1002, 'Completed',  'Meeting',    10, '2024-03-15', '2024-03-01'),
(10, 102, 1003, 'Cancelled',  'Meeting',    5,  '2024-01-05', '2023-12-20'); -- duplicate of row 5 (Status diff)
```

---

## Q1. Find the Second Highest Salary

```sql
-- Approach 1: DENSE_RANK (handles ties — recommended ✅)
WITH Ranked AS (
    SELECT Name, Salary,
           DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT Name, Salary FROM Ranked WHERE Rnk = 2;
-- Output: Bob (75000), Carol (75000) — both tied at 2nd

-- Approach 2: Subquery (simpler but no tie handling)
SELECT MAX(Salary) AS SecondHighest
FROM Employees
WHERE Salary < (SELECT MAX(Salary) FROM Employees);

-- Why DENSE_RANK over ROW_NUMBER?
-- Salary: 90000(1st), 75000(2nd), 60000(3rd)
-- ROW_NUMBER gives 1,2,3,4 — Alice=1, Bob=2, Carol=3 (wrong, Bob & Carol are equal)
-- DENSE_RANK gives 1,2,2,3 — Alice=1, Bob=2, Carol=2 ✅
```

---

## Q2. Find Nth Highest Salary (Generic)

```sql
-- Change @N to get any rank
DECLARE @N INT = 3;

WITH Ranked AS (
    SELECT Name, Salary,
           DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT Name, Salary FROM Ranked WHERE Rnk = @N;
-- @N=3 → Frank (80000), Grace (80000)
```

---

## Q3. Highest Salary Per Department

```sql
-- Approach 1: Window function (returns all columns) ✅
WITH Ranked AS (
    SELECT *,
           DENSE_RANK() OVER (PARTITION BY Department ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT EmpId, Name, Department, Salary
FROM Ranked WHERE Rnk = 1;

-- Approach 2: GROUP BY + JOIN (classic)
SELECT e.EmpId, e.Name, e.Department, e.Salary
FROM Employees e
JOIN (
    SELECT Department, MAX(Salary) AS MaxSal
    FROM Employees
    GROUP BY Department
) m ON e.Department = m.Department AND e.Salary = m.MaxSal;

-- Output:
-- Alice   Engineering  90000
-- Hank    Engineering  90000  (tied)
-- Dave    HR           60000
-- Frank   Finance      80000
-- Grace   Finance      80000  (tied)
```

---

## Q4. Employees Who Earn More Than Their Manager (Self-Join)

```sql
SELECT e.Name AS Employee, e.Salary AS EmpSalary,
       m.Name AS Manager,  m.Salary AS MgrSalary
FROM   Employees e
JOIN   Employees m ON e.ManagerId = m.EmpId
WHERE  e.Salary > m.Salary;

-- In our data: no employee earns more than their manager
-- If Bob had salary 95000: Bob (95000) > Alice (90000) → returned ✅
```

---

## Q5. Find Employees With No Manager (Top-Level / Root Nodes)

```sql
-- Approach 1: IS NULL
SELECT EmpId, Name, Department
FROM   Employees
WHERE  ManagerId IS NULL;
-- Output: Alice, Dave, Frank

-- Approach 2: NOT IN (watch out — NOT IN fails if subquery returns NULL)
SELECT EmpId, Name FROM Employees
WHERE  EmpId NOT IN (
    SELECT DISTINCT ManagerId FROM Employees WHERE ManagerId IS NOT NULL
);

-- Approach 3: NOT EXISTS (safer — handles NULLs correctly ✅)
SELECT e.EmpId, e.Name FROM Employees e
WHERE NOT EXISTS (
    SELECT 1 FROM Employees m WHERE m.EmpId = e.ManagerId
);
```

---

## Q6. Count Employees Per Department + Filter Departments With > 2 Employees

```sql
SELECT   Department,
         COUNT(*)         AS HeadCount,
         AVG(Salary)      AS AvgSalary,
         MAX(Salary)      AS MaxSalary,
         MIN(Salary)      AS MinSalary
FROM     Employees
GROUP BY Department
HAVING   COUNT(*) > 2
ORDER BY HeadCount DESC;

-- Output: Engineering (4 employees)
-- HR only has 3, Finance has 2 → Finance filtered out
```

---

## Q7. Find Duplicate Employees (Same Name + Department)

```sql
-- Show which combinations are duplicated
SELECT Name, Department, COUNT(*) AS Count
FROM   Employees
GROUP BY Name, Department
HAVING COUNT(*) > 1;

-- Show the actual duplicate rows with IDs
WITH Dupes AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY Name, Department ORDER BY EmpId) AS rn
    FROM Employees
)
SELECT * FROM Dupes WHERE rn > 1;   -- rows 2,3... of each duplicate group
```

---

## Q8. Delete Duplicate Employees — Keep Lowest EmpId

```sql
WITH Dupes AS (
    SELECT EmpId,
           ROW_NUMBER() OVER (PARTITION BY Name, Department ORDER BY EmpId ASC) AS rn
    FROM Employees
)
DELETE FROM Dupes WHERE rn > 1;
-- Keeps first occurrence (lowest EmpId), deletes rest
```

---

## Q9. Running Total of Salary (Cumulative Sum)

```sql
SELECT EmpId, Name, Department, Salary,
       SUM(Salary) OVER (
           PARTITION BY Department
           ORDER BY EmpId
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS RunningTotal
FROM Employees
ORDER BY Department, EmpId;

-- Engineering output:
-- Alice   90000   RunningTotal=90000
-- Bob     75000   RunningTotal=165000
-- Carol   75000   RunningTotal=240000
-- Hank    90000   RunningTotal=330000
```

---

## Q10. Previous and Next Salary Using LAG / LEAD

```sql
SELECT Name, Department, Salary,
       LAG(Salary)  OVER (PARTITION BY Department ORDER BY Salary DESC) AS PrevHigher,
       LEAD(Salary) OVER (PARTITION BY Department ORDER BY Salary DESC) AS NextLower
FROM Employees
ORDER BY Department, Salary DESC;

-- Engineering:
-- Alice  90000  PrevHigher=NULL   NextLower=90000
-- Hank   90000  PrevHigher=90000  NextLower=75000
-- Bob    75000  PrevHigher=90000  NextLower=75000
-- Carol  75000  PrevHigher=75000  NextLower=NULL
```

---

## Q11. Find Employees Whose Salary Is Above Department Average

```sql
SELECT e.Name, e.Department, e.Salary,
       dept_avg.AvgSalary
FROM Employees e
JOIN (
    SELECT Department, AVG(Salary) AS AvgSalary
    FROM Employees
    GROUP BY Department
) dept_avg ON e.Department = dept_avg.Department
WHERE e.Salary > dept_avg.AvgSalary;

-- Or with window function (more elegant):
SELECT Name, Department, Salary, AvgSalary
FROM (
    SELECT Name, Department, Salary,
           AVG(Salary) OVER (PARTITION BY Department) AS AvgSalary
    FROM Employees
) x
WHERE Salary > AvgSalary;
```

---

## Q12. Employees Hired in the Last 365 Days

```sql
SELECT Name, Department, JoinDate
FROM   Employees
WHERE  JoinDate >= DATEADD(DAY, -365, GETDATE())
ORDER BY JoinDate DESC;

-- Other date patterns:
-- Current month:  MONTH(JoinDate) = MONTH(GETDATE()) AND YEAR(JoinDate) = YEAR(GETDATE())
-- This year:      YEAR(JoinDate) = YEAR(GETDATE())
-- Between dates:  JoinDate BETWEEN '2022-01-01' AND '2022-12-31'
```

---

## Q13. Count Engagements Per Status Per Tenant

```sql
SELECT TenantId,
       Status,
       COUNT(*) AS Total
FROM   EngagementActivities
GROUP BY TenantId, Status
ORDER BY TenantId, Total DESC;

-- Output:
-- TenantId  Status     Total
-- 101       Completed  2
-- 101       Scheduled  1
-- 101       Cancelled  2
-- 102       Completed  2  ...
```

---

## Q14. Pivot: Count Per Status as Columns

```sql
-- Turn rows into columns using CASE WHEN + GROUP BY
SELECT TenantId,
       SUM(CASE WHEN Status = 'Completed'  THEN 1 ELSE 0 END) AS Completed,
       SUM(CASE WHEN Status = 'Scheduled'  THEN 1 ELSE 0 END) AS Scheduled,
       SUM(CASE WHEN Status = 'Cancelled'  THEN 1 ELSE 0 END) AS Cancelled
FROM   EngagementActivities
GROUP BY TenantId;

-- Output:
-- TenantId  Completed  Scheduled  Cancelled
-- 101       2          1          2
-- 102       2          1          1
```

---

## Q15. Most Active Company Per Tenant (Top 1 Per Group)

```sql
WITH CompanyActivity AS (
    SELECT TenantId, CompanyId, COUNT(*) AS ActivityCount,
           RANK() OVER (PARTITION BY TenantId ORDER BY COUNT(*) DESC) AS Rnk
    FROM   EngagementActivities
    GROUP BY TenantId, CompanyId
)
SELECT TenantId, CompanyId, ActivityCount
FROM   CompanyActivity
WHERE  Rnk = 1;

-- TenantId 101 → Company 1001 (most activities)
-- TenantId 102 → Company 1003
```

---

## Q16. Find Duplicate Engagement Activities (Same TenantId + CompanyId + ScheduledAt)

```sql
-- Show which combinations are duplicated
SELECT TenantId, CompanyId, ScheduledAt, COUNT(*) AS Count
FROM   EngagementActivities
GROUP BY TenantId, CompanyId, ScheduledAt
HAVING COUNT(*) > 1;

-- Delete duplicates, keep lowest Id
WITH Dupes AS (
    SELECT Id,
           ROW_NUMBER() OVER (
               PARTITION BY TenantId, CompanyId, ScheduledAt
               ORDER BY Id ASC
           ) AS rn
    FROM EngagementActivities
)
DELETE FROM Dupes WHERE rn > 1;
```

---

## Q17. Monthly Engagement Trend

```sql
SELECT YEAR(ScheduledAt)  AS Year,
       MONTH(ScheduledAt) AS Month,
       COUNT(*)           AS TotalEngagements,
       SUM(AttendeeCount) AS TotalAttendees,
       AVG(AttendeeCount) AS AvgAttendees
FROM   EngagementActivities
WHERE  Status = 'Completed'
GROUP BY YEAR(ScheduledAt), MONTH(ScheduledAt)
ORDER BY Year, Month;
```

---

## Q18. Find Companies With Only Cancelled Engagements

```sql
-- Companies where EVERY engagement is Cancelled (none Completed or Scheduled)
SELECT CompanyId
FROM   EngagementActivities
GROUP BY CompanyId
HAVING SUM(CASE WHEN Status != 'Cancelled' THEN 1 ELSE 0 END) = 0;

-- Equivalent using NOT EXISTS:
SELECT DISTINCT CompanyId
FROM   EngagementActivities e1
WHERE  NOT EXISTS (
    SELECT 1 FROM EngagementActivities e2
    WHERE e2.CompanyId = e1.CompanyId
    AND   e2.Status != 'Cancelled'
);
```

---

## Q19. Running Count of Engagements Per Company (Over Time)

```sql
SELECT CompanyId, ScheduledAt, Type, Status,
       ROW_NUMBER() OVER (
           PARTITION BY CompanyId
           ORDER BY ScheduledAt
       ) AS EngagementNumber,   -- 1st, 2nd, 3rd engagement with this company
       COUNT(*) OVER (
           PARTITION BY CompanyId
           ORDER BY ScheduledAt
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS RunningCount
FROM EngagementActivities
ORDER BY CompanyId, ScheduledAt;
```

---

## Q20. Find Tenants Who Have Both 'Completed' AND 'Cancelled' Engagements

```sql
-- Using INTERSECT
SELECT DISTINCT TenantId FROM EngagementActivities WHERE Status = 'Completed'
INTERSECT
SELECT DISTINCT TenantId FROM EngagementActivities WHERE Status = 'Cancelled';

-- Using GROUP BY + HAVING (more portable)
SELECT TenantId
FROM   EngagementActivities
GROUP BY TenantId
HAVING SUM(CASE WHEN Status = 'Completed'  THEN 1 ELSE 0 END) > 0
   AND SUM(CASE WHEN Status = 'Cancelled'  THEN 1 ELSE 0 END) > 0;

-- Output: 101, 102 (both have completed and cancelled)
```

---

## Q21. Update Salary — Give 10% Raise to Engineering Dept

```sql
-- Simple UPDATE with WHERE
UPDATE Employees
SET    Salary = Salary * 1.10
WHERE  Department = 'Engineering';

-- UPDATE with JOIN (raise employees who have a manager in same dept)
UPDATE e
SET    e.Salary = e.Salary * 1.10
FROM   Employees e
JOIN   Employees m ON e.ManagerId = m.EmpId
WHERE  e.Department = m.Department;
```

---

## Q22. Find Gaps in Sequential IDs

```sql
-- Find missing IDs in EngagementActivities
SELECT e1.Id + 1 AS MissingId
FROM   EngagementActivities e1
WHERE  NOT EXISTS (
    SELECT 1 FROM EngagementActivities e2
    WHERE  e2.Id = e1.Id + 1
)
AND e1.Id < (SELECT MAX(Id) FROM EngagementActivities);

-- Or using LAG:
SELECT PrevId + 1 AS GapStart, Id - 1 AS GapEnd
FROM (
    SELECT Id,
           LAG(Id) OVER (ORDER BY Id) AS PrevId
    FROM   EngagementActivities
) x
WHERE Id - PrevId > 1;
```

---

## Q23. Handle NULLs — Employees With No Salary

```sql
-- ISNULL: replace NULL with 0
SELECT Name, ISNULL(Salary, 0) AS Salary FROM Employees;

-- COALESCE: first non-NULL from a list
SELECT Name, COALESCE(Salary, 0) AS Salary FROM Employees;

-- Filter out NULLs
SELECT * FROM Employees WHERE Salary IS NOT NULL;

-- Include NULLs in aggregation awareness:
SELECT AVG(Salary) AS AvgWithNullIgnored   -- AVG ignores NULLs by default
FROM Employees;

SELECT AVG(ISNULL(Salary, 0)) AS AvgWithNullAsZero
FROM Employees;

-- Ivy has NULL salary:
-- AVG ignoring NULL → (90000+75000+75000+60000+55000+80000+80000+90000)/8 = 75625
-- AVG with NULL=0  → same sum / 9 = 67222
```

---

## Q24. CASE WHEN — Categorise Salary Bands

```sql
SELECT Name, Salary,
    CASE
        WHEN Salary >= 85000              THEN 'Senior'
        WHEN Salary >= 70000              THEN 'Mid'
        WHEN Salary >= 50000              THEN 'Junior'
        WHEN Salary IS NULL               THEN 'Unknown'
        ELSE                                   'Entry'
    END AS Band
FROM Employees
ORDER BY Salary DESC;
```

---

## Q25. Stored Procedure — Get Engagements by Tenant with Optional Status Filter

```sql
CREATE PROCEDURE usp_GetEngagements
    @TenantId INT,
    @Status   VARCHAR(20) = NULL     -- optional parameter
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id, CompanyId, Status, Type, AttendeeCount, ScheduledAt
    FROM   EngagementActivities
    WHERE  TenantId = @TenantId
    AND    (@Status IS NULL OR Status = @Status)   -- dynamic filter ✅
    ORDER BY ScheduledAt DESC;
END;

-- Usage:
EXEC usp_GetEngagements @TenantId = 101;                    -- all statuses
EXEC usp_GetEngagements @TenantId = 101, @Status = 'Completed'; -- filtered
```

---

## Quick Pattern Reference

```
GROUP BY + HAVING          → filter aggregated groups (Q6, Q16, Q20)
DENSE_RANK() OVER          → Nth highest salary, handles ties (Q1, Q2, Q3)
ROW_NUMBER() OVER PARTITION → top 1 per group, delete duplicates (Q7, Q8, Q15)
PARTITION BY X ORDER BY Y  → window restarts for each X value
LAG() / LEAD()             → previous/next row value in ordered set (Q10, Q22)
SUM() OVER (ORDER BY ...)  → running total / cumulative sum (Q9)
Self-join (e JOIN e m)     → employee-manager comparison (Q4)
NOT EXISTS                 → safer than NOT IN when NULLs possible (Q5, Q18)
CASE WHEN in SUM()         → conditional count / pivot rows to columns (Q14)
INTERSECT                  → rows present in both result sets (Q20)
ISNULL / COALESCE          → NULL handling (Q23)
DATEADD(DAY, -N, GETDATE()) → date range filter (Q12)
CTE (WITH x AS (...))      → readable multi-step queries (Q3, Q7, Q15)
```
