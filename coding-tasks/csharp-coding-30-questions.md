# C# Coding Practice — 30 Questions

> All solutions in C#. Run in a console app or LINQPad.

---

## Q1. Reverse Characters in a String (3 Approaches)

```csharp
string input = "Capital Access";

// a. Prepend Approach — build new string, prepend each char
string ReverseByPrepend(string s)
{
    string result = "";
    foreach (char c in s)
        result = c + result;   // prepend: each char goes to front
    return result;
}
// Output: "sseccA latipaC"

// b. StringBuilder — more efficient than string concatenation
string ReverseByStringBuilder(string s)
{
    var sb = new StringBuilder();
    for (int i = s.Length - 1; i >= 0; i--)
        sb.Append(s[i]);
    return sb.ToString();
}

// c. Swap — two pointers, swap from both ends toward center
string ReverseBySwap(string s)
{
    char[] arr = s.ToCharArray();
    int left = 0, right = arr.Length - 1;
    while (left < right)
    {
        (arr[left], arr[right]) = (arr[right], arr[left]);  // tuple swap ✅
        left++;
        right--;
    }
    return new string(arr);
}

// LINQ one-liner (not allowed if asked "without built-in"):
// new string(input.Reverse().ToArray())
```

---

## Q2. Reverse Words in a String

```csharp
string ReverseWords(string s)
{
    string[] words = s.Split(' ');
    Array.Reverse(words);
    return string.Join(" ", words);
}

// Input:  "Hello World from Capital Access"
// Output: "Access Capital from World Hello"

// With LINQ:
string ReverseWordsLinq(string s)
    => string.Join(" ", s.Split(' ').Reverse());
```

---

## Q3. Find Occurrence of Each Character in a String

```csharp
Dictionary<char, int> CharCount(string s)
{
    var counts = new Dictionary<char, int>();
    foreach (char c in s)
        counts[c] = counts.GetValueOrDefault(c, 0) + 1;
    return counts;
}

// With LINQ:
var counts = "Capital Access"
    .GroupBy(c => c)
    .ToDictionary(g => g.Key, g => g.Count());

// Print results sorted by frequency:
foreach (var (ch, count) in counts.OrderByDescending(x => x.Value))
    Console.WriteLine($"'{ch}': {count}");

// Input:  "Capital Access"
// 'a':3, 'c':2, 's':2, 'C':1, 'p':1, 'i':1, 't':1, 'l':1, ' ':1, 'A':1, 'e':1
```

---

## Q4. Find Two Numbers in an Array That Add Up to a Target

```csharp
// O(n) — HashSet approach
(int, int)? TwoSum(int[] nums, int target)
{
    var seen = new HashSet<int>();
    foreach (int n in nums)
    {
        int complement = target - n;
        if (seen.Contains(complement))
            return (complement, n);
        seen.Add(n);
    }
    return null;
}

// Input: [2, 7, 11, 15], target = 9
// Output: (2, 7) because 2 + 7 = 9 ✅

// Return indices instead:
int[] TwoSumIndices(int[] nums, int target)
{
    var map = new Dictionary<int, int>();   // value → index
    for (int i = 0; i < nums.Length; i++)
    {
        int complement = target - nums[i];
        if (map.ContainsKey(complement))
            return new[] { map[complement], i };
        map[nums[i]] = i;
    }
    return Array.Empty<int>();
}
```

---

## Q5. Check if a String is a Palindrome

```csharp
// Two-pointer approach
bool IsPalindrome(string s)
{
    int left = 0, right = s.Length - 1;
    while (left < right)
    {
        if (s[left] != s[right]) return false;
        left++; right--;
    }
    return true;
}

// Ignore case and spaces
bool IsPalindromeClean(string s)
{
    s = s.ToLower().Replace(" ", "");
    int left = 0, right = s.Length - 1;
    while (left < right)
    {
        if (s[left] != s[right]) return false;
        left++; right--;
    }
    return true;
}

// LINQ one-liner:
bool IsPalindromeLinq(string s) => s.SequenceEqual(s.Reverse());

// Input: "racecar" → true
// Input: "A man a plan a canal Panama" (cleaned: "amanaplanacanalpanama") → true
```

---

## Q6. Reverse an Array

```csharp
// Two-pointer swap
void ReverseArray(int[] arr)
{
    int left = 0, right = arr.Length - 1;
    while (left < right)
    {
        (arr[left], arr[right]) = (arr[right], arr[left]);
        left++; right--;
    }
}

// Using Array.Reverse (built-in):
Array.Reverse(arr);

// Input:  [1, 2, 3, 4, 5]
// Output: [5, 4, 3, 2, 1]
```

---

## Q7. Anagram Check

```csharp
// Two strings are anagrams if they contain the same characters with same frequencies
bool IsAnagram(string s1, string s2)
{
    if (s1.Length != s2.Length) return false;

    var counts = new Dictionary<char, int>();
    foreach (char c in s1)
        counts[c] = counts.GetValueOrDefault(c, 0) + 1;

    foreach (char c in s2)
    {
        if (!counts.ContainsKey(c)) return false;
        counts[c]--;
        if (counts[c] < 0) return false;
    }
    return true;
}

// Simpler — sort both and compare:
bool IsAnagramSort(string s1, string s2)
{
    var a1 = s1.ToLower().ToCharArray(); Array.Sort(a1);
    var a2 = s2.ToLower().ToCharArray(); Array.Sort(a2);
    return a1.SequenceEqual(a2);
}

// Input: "listen", "silent" → true
// Input: "hello",  "world"  → false
```

---

## Q8. Move All 0s to End of Array

```csharp
void MoveZerosToEnd(int[] arr)
{
    int insertPos = 0;

    // Pass 1: move all non-zero elements forward
    foreach (int n in arr)
        if (n != 0)
            arr[insertPos++] = n;

    // Pass 2: fill remaining positions with 0
    while (insertPos < arr.Length)
        arr[insertPos++] = 0;
}

// Input:  [0, 1, 0, 3, 12]
// Output: [1, 3, 12, 0, 0]

// Preserve relative order of non-zero elements ✅
```

---

## Q9. Find the First Non-Repeating Character

```csharp
char? FirstNonRepeating(string s)
{
    var counts = new Dictionary<char, int>();
    foreach (char c in s)
        counts[c] = counts.GetValueOrDefault(c, 0) + 1;

    foreach (char c in s)             // second pass: preserve order
        if (counts[c] == 1)
            return c;

    return null;
}

// With LINQ:
char? FirstNonRepeatingLinq(string s)
    => s.GroupBy(c => c)
        .FirstOrDefault(g => g.Count() == 1)?.Key;

// Input:  "swiss"   → 'w'
// Input:  "aabbcc"  → null (all repeat)
// Input:  "capital" → 'c' wait... c:1, a:2, p:1, i:1, t:1, l:1 → 'c' ✅
```

---

## Q10. Remove Duplicates from a String

```csharp
string RemoveDuplicates(string s)
{
    var seen = new HashSet<char>();
    var sb   = new StringBuilder();
    foreach (char c in s)
        if (seen.Add(c))   // Add returns false if already present
            sb.Append(c);
    return sb.ToString();
}

// Input:  "programming"
// Output: "progamin"  (first occurrence of each char kept in order)
```

---

## Q11. Swap Two Numbers

```csharp
// With temp variable (most readable)
void SwapWithTemp(ref int a, ref int b)
{
    int temp = a;
    a = b;
    b = temp;
}

// Without temp — arithmetic
void SwapArithmetic(ref int a, ref int b)
{
    a = a + b;
    b = a - b;   // b = original a
    a = a - b;   // a = original b
    // ⚠️ Risk: integer overflow for large numbers
}

// Without temp — XOR
void SwapXOR(ref int a, ref int b)
{
    a = a ^ b;
    b = a ^ b;   // b = original a
    a = a ^ b;   // a = original b
    // ⚠️ Fails if a and b point to same variable
}

// C# tuple swap (cleanest) ✅
(a, b) = (b, a);

// Test:
int x = 5, y = 10;
SwapWithTemp(ref x, ref y);
// x = 10, y = 5 ✅
```

---

## Q12. Reverse a Number Without Converting to String

```csharp
int ReverseNumber(int n)
{
    bool isNegative = n < 0;
    n = Math.Abs(n);
    int reversed = 0;

    while (n > 0)
    {
        int digit = n % 10;      // extract last digit
        reversed  = reversed * 10 + digit;  // append to result
        n         = n / 10;      // remove last digit
    }

    return isNegative ? -reversed : reversed;
}

// Input:  12345  → 54321
// Input:  -456   → -654
// Input:  1200   → 21 (leading zeros dropped)
//
// Step-by-step for 12345:
// n=12345, digit=5, reversed=5,     n=1234
// n=1234,  digit=4, reversed=54,    n=123
// n=123,   digit=3, reversed=543,   n=12
// n=12,    digit=2, reversed=5432,  n=1
// n=1,     digit=1, reversed=54321, n=0
```

---

## Q13. Extract the Surname

```csharp
string ExtractSurname(string fullName)
{
    string[] parts = fullName.Trim().Split(' ');
    return parts[parts.Length - 1];   // last word = surname
}

// With LINQ:
string ExtractSurnameLinq(string fullName)
    => fullName.Trim().Split(' ').Last();

// Input:  "Apoorv Kumar Jain"  → "Jain"
// Input:  "John Smith"         → "Smith"
```

---

## Q14. Find the Longest Substring Without Repeating Characters

```csharp
// Sliding window with Dictionary (stores last seen index)
string LongestSubstringNoRepeat(string s)
{
    var lastSeen = new Dictionary<char, int>();
    int start = 0, maxLen = 0, maxStart = 0;

    for (int i = 0; i < s.Length; i++)
    {
        if (lastSeen.ContainsKey(s[i]) && lastSeen[s[i]] >= start)
            start = lastSeen[s[i]] + 1;   // move window start past duplicate

        lastSeen[s[i]] = i;

        if (i - start + 1 > maxLen)
        {
            maxLen   = i - start + 1;
            maxStart = start;
        }
    }

    return s.Substring(maxStart, maxLen);
}

// Input:  "abcabcbb"  → "abc"  (length 3)
// Input:  "eghghhgg"  → "egh"  (length 3)
// Input:  "substring" → "ubstring" (length 8)
```

---

## Q15. Remove All White Spaces from a String

```csharp
// Using Replace
string RemoveSpaces(string s) => s.Replace(" ", "");

// Remove ALL whitespace (tabs, newlines too)
string RemoveAllWhitespace(string s)
    => new string(s.Where(c => !char.IsWhiteSpace(c)).ToArray());

// Using Regex:
string RemoveSpacesRegex(string s)
    => System.Text.RegularExpressions.Regex.Replace(s, @"\s+", "");

// Input:  "Capital Access Platform"
// Output: "CapitalAccessPlatform"
```

---

## Q16. Find the Longest Palindromic Substring

```csharp
// Expand-around-center approach: O(n²)
string LongestPalindromicSubstring(string s)
{
    if (s.Length == 0) return "";
    int start = 0, maxLen = 1;

    void Expand(int left, int right)
    {
        while (left >= 0 && right < s.Length && s[left] == s[right])
        {
            if (right - left + 1 > maxLen)
            {
                maxLen = right - left + 1;
                start  = left;
            }
            left--; right++;
        }
    }

    for (int i = 0; i < s.Length; i++)
    {
        Expand(i, i);     // odd-length palindromes ("racecar")
        Expand(i, i + 1); // even-length palindromes ("abba")
    }

    return s.Substring(start, maxLen);
}

// Input:  "babad"   → "bab" or "aba"
// Input:  "cbbd"    → "bb"
// Input:  "racecar" → "racecar"
```

---

## Q17. Array Circular Print in Groups

```csharp
// Given [1,2,3,4,5,6], print in groups of 4 wrapping around:
// Line 1: 1 2 3 4
// Line 2: 5 6 1 2

void PrintCircularGroups(int[] arr, int groupSize)
{
    int n = arr.Length;
    for (int row = 0; row < n; row += groupSize)
    {
        var line = new List<string>();
        for (int col = 0; col < groupSize; col++)
        {
            int idx = (row + col) % n;   // wrap around using modulo ✅
            line.Add(arr[idx].ToString());
        }
        Console.WriteLine(string.Join(" ", line));
    }
}

// PrintCircularGroups(new[]{1,2,3,4,5,6}, 4)
// Output:
// 1 2 3 4
// 5 6 1 2
```

---

## Q18. Left/Right Rotate an Array by K Places

```csharp
// Left rotate by K: [1,2,3,4,5] k=2 → [3,4,5,1,2]
int[] LeftRotate(int[] arr, int k)
{
    int n = arr.Length;
    k = k % n;   // handle k > n
    return arr.Skip(k).Concat(arr.Take(k)).ToArray();
}

// Right rotate by K: [1,2,3,4,5] k=2 → [4,5,1,2,3]
int[] RightRotate(int[] arr, int k)
{
    int n = arr.Length;
    k = k % n;
    return arr.Skip(n - k).Concat(arr.Take(n - k)).ToArray();
}

// In-place using reverse trick (O(1) space):
void LeftRotateInPlace(int[] arr, int k)
{
    int n = arr.Length;
    k = k % n;
    Reverse(arr, 0, k - 1);     // reverse first k elements
    Reverse(arr, k, n - 1);     // reverse rest
    Reverse(arr, 0, n - 1);     // reverse entire array
}

void Reverse(int[] arr, int left, int right)
{
    while (left < right)
    {
        (arr[left], arr[right]) = (arr[right], arr[left]);
        left++; right--;
    }
}

// Left rotate [1,2,3,4,5] by k=2:
// Reverse [1,2]     → [2,1,3,4,5]
// Reverse [3,4,5]   → [2,1,5,4,3]
// Reverse all       → [3,4,5,1,2] ✅
```

---

## Q19. Prime Numbers

```csharp
// Check if a single number is prime
bool IsPrime(int n)
{
    if (n < 2) return false;
    if (n == 2) return true;
    if (n % 2 == 0) return false;
    for (int i = 3; i <= Math.Sqrt(n); i += 2)
        if (n % i == 0) return false;
    return true;
}

// Print all primes up to N (Sieve of Eratosthenes — efficient)
void PrintPrimesUpTo(int n)
{
    bool[] isComposite = new bool[n + 1];
    for (int i = 2; i * i <= n; i++)
        if (!isComposite[i])
            for (int j = i * i; j <= n; j += i)
                isComposite[j] = true;

    for (int i = 2; i <= n; i++)
        if (!isComposite[i])
            Console.Write(i + " ");
}

// PrintPrimesUpTo(30) → 2 3 5 7 11 13 17 19 23 29
```

---

## Q20. Factorial Using Recursion

```csharp
// Recursive
long Factorial(int n)
{
    if (n < 0)  throw new ArgumentException("n must be >= 0");
    if (n == 0 || n == 1) return 1;   // base case
    return n * Factorial(n - 1);       // recursive call
}

// Iterative (for comparison — no stack overflow risk)
long FactorialIterative(int n)
{
    long result = 1;
    for (int i = 2; i <= n; i++)
        result *= i;
    return result;
}

// Factorial(5) = 5 × 4 × 3 × 2 × 1 = 120
// Factorial(0) = 1  (by definition)
// Call stack for Factorial(5):
// Factorial(5) = 5 × Factorial(4)
//                    4 × Factorial(3)
//                        3 × Factorial(2)
//                            2 × Factorial(1)
//                                = 1        → unwind → 2→6→24→120
```

---

## Q21. Find Maximum Number in Array

```csharp
// Manual loop
int FindMax(int[] arr)
{
    if (arr.Length == 0) throw new ArgumentException("Empty array");
    int max = arr[0];
    foreach (int n in arr)
        if (n > max) max = n;
    return max;
}

// LINQ (if allowed)
int max = arr.Max();

// Without LINQ, without loop — using recursion
int FindMaxRecursive(int[] arr, int index = 0)
{
    if (index == arr.Length - 1) return arr[index];
    return Math.Max(arr[index], FindMaxRecursive(arr, index + 1));
}

// Input: [3, 1, 7, 2, 9, 4] → 9
```

---

## Q22. Fibonacci Series

```csharp
// Output: 1, 1, 2, 3, 5, 8, 13, 21

// Iterative ✅
void PrintFibonacci(int count)
{
    int a = 1, b = 1;
    for (int i = 0; i < count; i++)
    {
        Console.Write(a + (i < count - 1 ? ", " : ""));
        int next = a + b;
        a = b;
        b = next;
    }
}
// PrintFibonacci(8) → 1, 1, 2, 3, 5, 8, 13, 21

// Recursive (elegant but O(2^n) — exponential)
int Fibonacci(int n)
{
    if (n <= 2) return 1;
    return Fibonacci(n - 1) + Fibonacci(n - 2);
}

// Memoized recursive (O(n))
int FibMemo(int n, Dictionary<int, int>? memo = null)
{
    memo ??= new Dictionary<int, int>();
    if (n <= 2) return 1;
    if (memo.ContainsKey(n)) return memo[n];
    memo[n] = FibMemo(n - 1, memo) + FibMemo(n - 2, memo);
    return memo[n];
}
```

---

## Q23. Star Pattern Examples

```csharp
// Pattern 1: Right Triangle
// *
// **
// ***
// ****
void RightTriangle(int rows)
{
    for (int i = 1; i <= rows; i++)
        Console.WriteLine(new string('*', i));
}

// Pattern 2: Pyramid
//    *
//   ***
//  *****
// *******
void Pyramid(int rows)
{
    for (int i = 1; i <= rows; i++)
    {
        Console.Write(new string(' ', rows - i));
        Console.WriteLine(new string('*', 2 * i - 1));
    }
}

// Pattern 3: Diamond
void Diamond(int rows)
{
    // Upper half (including middle)
    for (int i = 1; i <= rows; i++)
    {
        Console.Write(new string(' ', rows - i));
        Console.WriteLine(new string('*', 2 * i - 1));
    }
    // Lower half
    for (int i = rows - 1; i >= 1; i--)
    {
        Console.Write(new string(' ', rows - i));
        Console.WriteLine(new string('*', 2 * i - 1));
    }
}

// Pattern 4: Hollow Square
void HollowSquare(int n)
{
    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
            Console.Write(i == 0 || i == n-1 || j == 0 || j == n-1 ? "* " : "  ");
        Console.WriteLine();
    }
}
```

---

## Q24. What Is the Next Number: 1, 3, 7, 13, ___?

```
Pattern analysis:
  1 → 3:   +2
  3 → 7:   +4
  7 → 13:  +6
  13 → ?:  +8  → 21

Answer: 21

Differences form an arithmetic sequence: 2, 4, 6, 8, 10...
Formula: a(n) = n² - n + 1
  n=1: 1-1+1 = 1  ✅
  n=2: 4-2+1 = 3  ✅
  n=3: 9-3+1 = 7  ✅
  n=4: 16-4+1 = 13 ✅
  n=5: 25-5+1 = 21 ✅
```

```csharp
int NextInSeries(int n) => n * n - n + 1;
// NextInSeries(5) = 21

// Generate sequence:
for (int i = 1; i <= 8; i++)
    Console.Write(NextInSeries(i) + " ");
// 1 3 7 13 21 31 43 57
```

---

## Q25. Find Duplicate Records in a Table (SQL)

```sql
-- Find duplicate rows (same Name + Department)
SELECT Name, Department, COUNT(*) AS Occurrences
FROM   Employees
GROUP BY Name, Department
HAVING COUNT(*) > 1;

-- Show the actual duplicate rows with their IDs
WITH Duplicates AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY Name, Department
            ORDER BY Id
        ) AS rn
    FROM Employees
)
SELECT * FROM Duplicates WHERE rn > 1;   -- rows 2,3,4... of each duplicate group
```

---

## Q26. Find Nth Highest Salary (SQL)

```sql
-- Using DENSE_RANK (handles ties correctly)
WITH Ranked AS (
    SELECT EmployeeId, Name, Salary,
        DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 2;   -- 2nd highest salary

-- Why DENSE_RANK not ROW_NUMBER?
-- If two people have salary 90000 (tied for 1st), ROW_NUMBER gives 1,2 (skips tied)
-- DENSE_RANK gives 1,1 for the tie → Rnk=2 correctly finds NEXT distinct salary

-- Nth highest per department:
WITH Ranked AS (
    SELECT *,
        DENSE_RANK() OVER (PARTITION BY Department ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 2;   -- 2nd highest per department
```

---

## Q27. Sort Array of 0s, 1s, 2s (Dutch National Flag)

```csharp
// Three pointers: low, mid, high
// [0..low-1] = all 0s  [low..mid-1] = all 1s  [high+1..n-1] = all 2s
void SortColors(int[] nums)
{
    int low = 0, mid = 0, high = nums.Length - 1;

    while (mid <= high)
    {
        if (nums[mid] == 0)
        {
            (nums[low], nums[mid]) = (nums[mid], nums[low]);
            low++; mid++;
        }
        else if (nums[mid] == 1)
        {
            mid++;
        }
        else   // nums[mid] == 2
        {
            (nums[mid], nums[high]) = (nums[high], nums[mid]);
            high--;   // don't increment mid — newly swapped element not yet checked
        }
    }
}

// Input:  [2, 1, 2, 0, 1, 0, 1, 0, 1]
// Output: [0, 0, 0, 1, 1, 1, 1, 2, 2]
// O(n) time, O(1) space ✅ — single pass
```

---

## Q28. Longest Substring Without Repeating Characters (Sliding Window)

```csharp
int LongestSubstringLength(string s)
{
    var lastIndex = new Dictionary<char, int>();
    int maxLen = 0, start = 0;

    for (int i = 0; i < s.Length; i++)
    {
        if (lastIndex.ContainsKey(s[i]) && lastIndex[s[i]] >= start)
            start = lastIndex[s[i]] + 1;   // shrink window past the duplicate

        lastIndex[s[i]] = i;
        maxLen = Math.Max(maxLen, i - start + 1);
    }
    return maxLen;
}

// Input: "eghghhgg"  → 3  ("egh")
// Input: "substring" → 8  ("ubstring")
// Input: "abcabcbb"  → 3  ("abc")
// Input: "bbbbb"     → 1  ("b")
// O(n) time, O(min(n,k)) space where k = charset size
```

---

## Q29. Maximum Sum of Contiguous Subarray of Size K (Sliding Window)

```csharp
int MaxSumSubarrayOfSizeK(int[] nums, int k)
{
    if (nums.Length < k) throw new ArgumentException("k > array length");

    // Compute sum of first window
    int windowSum = 0;
    for (int i = 0; i < k; i++)
        windowSum += nums[i];

    int maxSum = windowSum;

    // Slide the window: add next element, remove first element of previous window
    for (int i = k; i < nums.Length; i++)
    {
        windowSum += nums[i] - nums[i - k];   // slide: add right, drop left ✅
        maxSum = Math.Max(maxSum, windowSum);
    }
    return maxSum;
}

// Input: nums=[2,1,5,1,3,2], k=3 → Output: 9
// Window sums: [2+1+5]=8, [1+5+1]=7, [5+1+3]=9 ✅, [1+3+2]=6
// Max = 9 (subarray [5,1,3])
// O(n) time ✅ — each element added and removed exactly once
```

---

## Q30. Valid Parentheses (Stack)

```csharp
bool IsValidParentheses(string s)
{
    var stack = new Stack<char>();
    var matching = new Dictionary<char, char>
    {
        [')'] = '(',
        ['}'] = '{',
        [']'] = '['
    };

    foreach (char c in s)
    {
        if (c == '(' || c == '{' || c == '[')
        {
            stack.Push(c);   // opening bracket → push onto stack
        }
        else
        {
            if (stack.Count == 0) return false;          // no matching opening
            if (stack.Pop() != matching[c]) return false; // wrong type
        }
    }

    return stack.Count == 0;   // stack must be empty — all opened were closed ✅
}

// Input: "(){}[]"  → true  ✅
// Input: "()(}[]"  → false (} doesn't match ()
// Input: "([)]"    → false (wrong order)
// Input: "{[]}"    → true  ✅
// Input: "("       → false (unclosed)

// Step-by-step for "({[]})":
// '(' → push  stack: ['(']
// '{' → push  stack: ['(', '{']
// '[' → push  stack: ['(', '{', '[']
// ']' → pop '[' → matches ✅  stack: ['(', '{']
// '}' → pop '{' → matches ✅  stack: ['(']
// ')' → pop '(' → matches ✅  stack: []
// Empty stack → true ✅
```

---

## Quick Reference — Patterns Used

| Problem | Pattern | Time | Space |
|---------|---------|------|-------|
| Two Sum | HashMap | O(n) | O(n) |
| Move zeros | Two pointer | O(n) | O(1) |
| Longest substring | Sliding window + HashMap | O(n) | O(k) |
| Max sum subarray k | Sliding window | O(n) | O(1) |
| Sort 0s/1s/2s | Three pointer (Dutch flag) | O(n) | O(1) |
| Valid parentheses | Stack | O(n) | O(n) |
| Palindrome check | Two pointer | O(n) | O(1) |
| Fibonacci | DP / memoization | O(n) | O(n) |
| Reverse string | Two pointer swap | O(n) | O(1) |
| Anagram | Frequency count / Sort | O(n log n) | O(1) |
