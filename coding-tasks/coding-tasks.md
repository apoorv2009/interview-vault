# Coding Tasks — Interview Prep

---

## Task 1: Count Character Occurrences in a String (C#)

**Question:** Write a C# function that counts how many times each character appears in a string.

```csharp
// Solution 1: Dictionary — most readable, interview standard ✅
public static Dictionary<char, int> CountCharacters(string input)
{
    var counts = new Dictionary<char, int>();
    foreach (char c in input)
    {
        if (counts.ContainsKey(c))
            counts[c]++;
        else
            counts[c] = 1;
    }
    return counts;
}

// Solution 2: LINQ — concise ✅
public static Dictionary<char, int> CountCharactersLinq(string input)
    => input.GroupBy(c => c)
            .ToDictionary(g => g.Key, g => g.Count());

// Solution 3: GetOrAdd pattern — cleaner than ContainsKey check
public static Dictionary<char, int> CountCharactersClean(string input)
{
    var counts = new Dictionary<char, int>();
    foreach (char c in input)
        counts[c] = counts.GetValueOrDefault(c, 0) + 1;
    return counts;
}

// Usage:
var result = CountCharacters("Capital Access");
// 'C':1, 'a':3, 'p':1, 'i':1, 't':1, 'l':1, ' ':1, 'A':1, 'c':2, 'e':1, 's':2

// Print results
foreach (var (ch, count) in result.OrderByDescending(x => x.Value))
    Console.WriteLine($"'{ch}': {count}");

// Edge cases to mention in interview:
// - null input: add null check → if (input == null) return new Dictionary<char, int>();
// - case sensitivity: add .ToLower() or .ToUpper() if needed
// - ignore spaces: add if (c == ' ') continue;
```

**Time complexity:** O(n) — one pass through string  
**Space complexity:** O(k) — k = number of distinct characters

---

## Task 2: Find Employee in Most Overcrowded Room (SQL)

**Question:** Given a table of employees with their room assignments, find the employee(s) in the most overcrowded room (room with the most employees).

```sql
-- Table: Employees(EmployeeId, Name, RoomNumber)
-- Sample data:
-- 1, Alice,   Room A
-- 2, Bob,     Room A
-- 3, Carol,   Room A
-- 4, Dave,    Room B
-- 5, Eve,     Room B
-- 6, Frank,   Room C

-- Solution 1: CTE with RANK (handles ties — two rooms equally crowded) ✅
WITH RoomCounts AS (
    SELECT RoomNumber, COUNT(*) AS EmployeeCount
    FROM   Employees
    GROUP BY RoomNumber
),
RankedRooms AS (
    SELECT RoomNumber, EmployeeCount,
           RANK() OVER (ORDER BY EmployeeCount DESC) AS Rnk
    FROM RoomCounts
)
SELECT e.EmployeeId, e.Name, e.RoomNumber, r.EmployeeCount
FROM   Employees e
JOIN   RankedRooms r ON r.RoomNumber = e.RoomNumber
WHERE  r.Rnk = 1
ORDER BY e.Name;

-- Result: Alice, Bob, Carol (Room A has 3 people — most crowded)

-- Solution 2: Subquery (simpler, no ties handling)
SELECT e.EmployeeId, e.Name, e.RoomNumber
FROM   Employees e
WHERE  e.RoomNumber = (
    SELECT TOP 1 RoomNumber
    FROM   Employees
    GROUP BY RoomNumber
    ORDER BY COUNT(*) DESC
);

-- Solution 3: Using MAX in subquery (handles ties correctly)
SELECT e.EmployeeId, e.Name, e.RoomNumber
FROM   Employees e
JOIN (
    SELECT RoomNumber
    FROM   Employees
    GROUP BY RoomNumber
    HAVING COUNT(*) = (
        SELECT MAX(cnt) FROM (
            SELECT COUNT(*) AS cnt FROM Employees GROUP BY RoomNumber
        ) t
    )
) r ON r.RoomNumber = e.RoomNumber;
```

**Key points to mention:**
- Use RANK() not ROW_NUMBER() in case two rooms have equal count (ties)
- CTE makes it readable — show you know CTEs
- Can extend to get the room + count + all employees in it

---

## Task 3: LINQ Divisible-by-N

```csharp
var numbers = Enumerable.Range(1, 30);

// Divisible by 3
numbers.Where(n => n % 3 == 0).ToList();

// FizzBuzz
numbers.Select(n => n % 15 == 0 ? "FizzBuzz" :
                    n % 3  == 0 ? "Fizz" :
                    n % 5  == 0 ? "Buzz" :
                                  n.ToString())
       .ToList();

// Generic N
Func<int, int, bool> divisibleBy = (n, divisor) => n % divisor == 0;
numbers.Where(n => divisibleBy(n, 4)).ToList(); // divisible by 4
```
