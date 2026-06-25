# C# Coding — 30 Questions (No Built-in Functions)

> **Rules:** Only `for`/`while` loops, `char[]`, array indexing (`s[i]`), `.Length`, basic operators.
> No LINQ, no `Array.Reverse/Sort`, no `Split/Join/Replace`, no `Math.*`, no `StringBuilder`, no `char.IsX()`.
> Dictionary / HashSet / Stack are data structures — allowed.

---

## Q1. Reverse a String (3 Approaches)

```csharp
// a. Prepend — build result by adding each char to front
static string ReverseByPrepend(string s)
{
    string result = "";
    for (int i = 0; i < s.Length; i++)
        result = s[i] + result;      // each char prepended
    return result;
}

// b. Char Array (replaces StringBuilder)
static string ReverseByCharArray(string s)
{
    char[] result = new char[s.Length];
    for (int i = 0; i < s.Length; i++)
        result[i] = s[s.Length - 1 - i];    // fill from end
    return new string(result);
}

// c. Swap in place (two pointer)
static string ReverseBySwap(string s)
{
    char[] arr = new char[s.Length];
    for (int i = 0; i < s.Length; i++) arr[i] = s[i];  // copy to char[]

    int left = 0, right = arr.Length - 1;
    while (left < right)
    {
        char temp   = arr[left];
        arr[left]   = arr[right];
        arr[right]  = temp;
        left++; right--;
    }
    return new string(arr);
}

// Input: "Capital" → "latipaC"
```

---

## Q2. Reverse Words in a String

```csharp
static string ReverseWords(string s)
{
    // Step 1: extract words manually (no Split)
    string[] words = new string[s.Length];   // max possible
    int wordCount = 0;
    int i = 0;

    while (i < s.Length)
    {
        while (i < s.Length && s[i] == ' ') i++;   // skip spaces
        if (i >= s.Length) break;

        int start = i;
        while (i < s.Length && s[i] != ' ') i++;   // find word end

        char[] word = new char[i - start];
        for (int j = start; j < i; j++)
            word[j - start] = s[j];
        words[wordCount++] = new string(word);
    }

    // Step 2: build result in reverse order (no Join)
    char[] result = new char[s.Length];
    int pos = 0;
    for (int w = wordCount - 1; w >= 0; w--)
    {
        for (int j = 0; j < words[w].Length; j++)
            result[pos++] = words[w][j];
        if (w > 0) result[pos++] = ' ';
    }
    return new string(result, 0, pos);
}

// Input:  "Hello World Capital" → "Capital World Hello"
```

---

## Q3. Find Occurrence of Each Character

```csharp
static void CharFrequency(string s)
{
    // int[256] covers all ASCII characters — no Dictionary needed
    int[] count = new int[256];
    for (int i = 0; i < s.Length; i++)
        count[s[i]]++;

    // Print non-zero entries
    for (int i = 0; i < 256; i++)
        if (count[i] > 0)
            Console.WriteLine($"'{(char)i}': {count[i]}");
}

// Input: "aabbc" → 'a':2, 'b':2, 'c':1
```

---

## Q4. Two Numbers That Add Up to a Target

```csharp
static int[] TwoSum(int[] nums, int target)
{
    // Use Dictionary as data structure (it's not a built-in function)
    var seen = new Dictionary<int, int>();   // value → index

    for (int i = 0; i < nums.Length; i++)
    {
        int complement = target - nums[i];
        if (seen.ContainsKey(complement))
            return new int[] { seen[complement], i };
        seen[nums[i]] = i;
    }
    return new int[] { -1, -1 };   // not found
}

// Input: [2, 7, 11, 15], target=9 → [0, 1] (2+7=9)
```

---

## Q5. Check if a String is a Palindrome

```csharp
static bool IsPalindrome(string s)
{
    int left = 0, right = s.Length - 1;
    while (left < right)
    {
        if (s[left] != s[right]) return false;
        left++; right--;
    }
    return true;
}

// Ignore case and spaces (manual lower + space skip):
static bool IsPalindromeClean(string s)
{
    // Build cleaned version: lower case, no spaces
    char[] clean = new char[s.Length];
    int len = 0;
    for (int i = 0; i < s.Length; i++)
    {
        if (s[i] == ' ') continue;
        // Manual toLower: if uppercase A-Z, add 32 to get lowercase
        clean[len++] = (s[i] >= 'A' && s[i] <= 'Z') ? (char)(s[i] + 32) : s[i];
    }

    int left = 0, right = len - 1;
    while (left < right)
    {
        if (clean[left] != clean[right]) return false;
        left++; right--;
    }
    return true;
}

// Input: "racecar" → true
// Input: "A man a plan a canal Panama" → true
```

---

## Q6. Reverse an Array

```csharp
static void ReverseArray(int[] arr)
{
    int left = 0, right = arr.Length - 1;
    while (left < right)
    {
        int temp    = arr[left];
        arr[left]   = arr[right];
        arr[right]  = temp;
        left++; right--;
    }
}

// Input:  [1, 2, 3, 4, 5] → [5, 4, 3, 2, 1]
```

---

## Q7. Anagram Check

```csharp
static bool IsAnagram(string s1, string s2)
{
    if (s1.Length != s2.Length) return false;

    int[] count = new int[256];       // increment for s1, decrement for s2
    for (int i = 0; i < s1.Length; i++)
    {
        count[s1[i]]++;
        count[s2[i]]--;
    }

    for (int i = 0; i < 256; i++)
        if (count[i] != 0) return false;

    return true;
}

// Input: "listen", "silent" → true
// Input: "hello",  "world"  → false
```

---

## Q8. Move All 0s to End of Array

```csharp
static void MoveZerosToEnd(int[] arr)
{
    int insertPos = 0;

    // Pass 1: push all non-zero elements to front
    for (int i = 0; i < arr.Length; i++)
        if (arr[i] != 0)
            arr[insertPos++] = arr[i];

    // Pass 2: fill remaining slots with 0
    while (insertPos < arr.Length)
        arr[insertPos++] = 0;
}

// Input:  [0, 1, 0, 3, 12] → [1, 3, 12, 0, 0]
```

---

## Q9. Find the First Non-Repeating Character

```csharp
static char FirstNonRepeating(string s)
{
    int[] count = new int[256];
    for (int i = 0; i < s.Length; i++)
        count[s[i]]++;

    for (int i = 0; i < s.Length; i++)   // preserve original order
        if (count[s[i]] == 1)
            return s[i];

    return '\0';   // none found
}

// Input:  "swiss"   → 'w'
// Input:  "aabbcc"  → '\0'
```

---

## Q10. Remove Duplicates from a String

```csharp
static string RemoveDuplicates(string s)
{
    bool[] seen   = new bool[256];
    char[] result = new char[s.Length];
    int pos = 0;

    for (int i = 0; i < s.Length; i++)
    {
        if (!seen[s[i]])
        {
            seen[s[i]]    = true;
            result[pos++] = s[i];
        }
    }
    return new string(result, 0, pos);
}

// Input:  "programming" → "progamin"
```

---

## Q11. Swap Two Numbers

```csharp
// With temp (clearest)
static void SwapWithTemp(ref int a, ref int b)
{
    int temp = a;
    a = b;
    b = temp;
}

// Without temp — arithmetic
static void SwapArithmetic(ref int a, ref int b)
{
    a = a + b;   // a holds sum
    b = a - b;   // b = original a
    a = a - b;   // a = original b
}

// Without temp — XOR
static void SwapXOR(ref int a, ref int b)
{
    a = a ^ b;
    b = a ^ b;   // recovers original a
    a = a ^ b;   // recovers original b
}

// Input: a=5, b=10 → a=10, b=5
```

---

## Q12. Reverse a Number (No String Conversion)

```csharp
static int ReverseNumber(int n)
{
    bool negative = n < 0;
    if (negative) n = n * -1;   // manual abs (no Math.Abs)

    int reversed = 0;
    while (n > 0)
    {
        reversed = reversed * 10 + (n % 10);  // extract last digit, append
        n        = n / 10;                     // remove last digit
    }
    return negative ? -reversed : reversed;
}

// Input: 12345 → 54321
// Input: -456  → -654
// Step trace for 12345:
//   digit=5, rev=5,     n=1234
//   digit=4, rev=54,    n=123
//   digit=3, rev=543,   n=12
//   digit=2, rev=5432,  n=1
//   digit=1, rev=54321, n=0
```

---

## Q13. Extract the Surname

```csharp
static string ExtractSurname(string fullName)
{
    // Find last space index
    int lastSpace = -1;
    for (int i = 0; i < fullName.Length; i++)
        if (fullName[i] == ' ')
            lastSpace = i;

    if (lastSpace == -1) return fullName;   // single name

    int len = fullName.Length - lastSpace - 1;
    char[] surname = new char[len];
    for (int i = 0; i < len; i++)
        surname[i] = fullName[lastSpace + 1 + i];

    return new string(surname);
}

// Input: "Apoorv Kumar Jain" → "Jain"
```

---

## Q14. Longest Substring Without Repeating Characters (return the string)

```csharp
static string LongestSubstringNoRepeat(string s)
{
    int[] lastIndex = new int[256];
    for (int i = 0; i < 256; i++) lastIndex[i] = -1;  // -1 = not seen

    int start = 0, maxLen = 0, maxStart = 0;

    for (int i = 0; i < s.Length; i++)
    {
        if (lastIndex[s[i]] >= start)
            start = lastIndex[s[i]] + 1;    // shrink window

        lastIndex[s[i]] = i;

        if (i - start + 1 > maxLen)
        {
            maxLen   = i - start + 1;
            maxStart = start;
        }
    }

    char[] result = new char[maxLen];
    for (int i = 0; i < maxLen; i++)
        result[i] = s[maxStart + i];
    return new string(result);
}

// Input: "abcabcbb"  → "abc"
// Input: "eghghhgg"  → "egh"
```

---

## Q15. Remove All White Spaces

```csharp
static string RemoveSpaces(string s)
{
    char[] result = new char[s.Length];
    int pos = 0;
    for (int i = 0; i < s.Length; i++)
        if (s[i] != ' ' && s[i] != '\t' && s[i] != '\n' && s[i] != '\r')
            result[pos++] = s[i];
    return new string(result, 0, pos);
}

// Input:  "Capital Access" → "CapitalAccess"
```

---

## Q16. Longest Palindromic Substring

```csharp
static string LongestPalindrome(string s)
{
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
        Expand(i, i);       // odd length: "aba"
        Expand(i, i + 1);   // even length: "abba"
    }

    char[] result = new char[maxLen];
    for (int i = 0; i < maxLen; i++)
        result[i] = s[start + i];
    return new string(result);
}

// Input: "babad"   → "bab"
// Input: "racecar" → "racecar"
```

---

## Q17. Circular Array Print in Groups

```csharp
static void PrintCircularGroups(int[] arr, int groupSize)
{
    int n = arr.Length;
    for (int row = 0; row < n; row += groupSize)
    {
        for (int col = 0; col < groupSize; col++)
        {
            int idx = (row + col) % n;
            Console.Write(arr[idx]);
            if (col < groupSize - 1) Console.Write(" ");
        }
        Console.WriteLine();
    }
}

// Input: [1,2,3,4,5,6], groupSize=4
// Output:
// 1 2 3 4
// 5 6 1 2
```

---

## Q18. Left / Right Rotate Array by K Places

```csharp
// Helper: reverse a section of array
static void Reverse(int[] arr, int left, int right)
{
    while (left < right)
    {
        int temp    = arr[left];
        arr[left]   = arr[right];
        arr[right]  = temp;
        left++; right--;
    }
}

// Left rotate: [1,2,3,4,5] by k=2 → [3,4,5,1,2]
static void LeftRotate(int[] arr, int k)
{
    int n = arr.Length;
    k = k % n;
    Reverse(arr, 0, k - 1);     // reverse first k
    Reverse(arr, k, n - 1);     // reverse rest
    Reverse(arr, 0, n - 1);     // reverse all
}

// Right rotate: [1,2,3,4,5] by k=2 → [4,5,1,2,3]
static void RightRotate(int[] arr, int k)
{
    int n = arr.Length;
    k = k % n;
    Reverse(arr, 0, n - 1);     // reverse all
    Reverse(arr, 0, k - 1);     // reverse first k
    Reverse(arr, k, n - 1);     // reverse rest
}

// Left rotate [1,2,3,4,5] k=2:
// Step 1 reverse[0..1]: [2,1,3,4,5]
// Step 2 reverse[2..4]: [2,1,5,4,3]
// Step 3 reverse all:   [3,4,5,1,2] ✅
```

---

## Q19. Prime Numbers

```csharp
// Check single number — i*i <= n replaces Math.Sqrt
static bool IsPrime(int n)
{
    if (n < 2) return false;
    if (n == 2) return true;
    if (n % 2 == 0) return false;
    for (int i = 3; i * i <= n; i += 2)
        if (n % i == 0) return false;
    return true;
}

// Print all primes up to N (Sieve of Eratosthenes)
static void PrintPrimes(int n)
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
// PrintPrimes(30) → 2 3 5 7 11 13 17 19 23 29
```

---

## Q20. Factorial Using Recursion

```csharp
static long Factorial(int n)
{
    if (n == 0 || n == 1) return 1;   // base case
    return (long)n * Factorial(n - 1);
}

// Factorial(5):
//   5 × Factorial(4)
//       4 × Factorial(3)
//           3 × Factorial(2)
//               2 × Factorial(1)
//                   = 1
//   unwinds: 2 → 6 → 24 → 120
```

---

## Q21. Find Maximum Number in Array

```csharp
static int FindMax(int[] arr)
{
    int max = arr[0];
    for (int i = 1; i < arr.Length; i++)
        if (arr[i] > max)
            max = arr[i];
    return max;
}

// Input: [3, 1, 7, 2, 9, 4] → 9
```

---

## Q22. Fibonacci Series

```csharp
static void PrintFibonacci(int count)
{
    if (count <= 0) return;
    int a = 1, b = 1;
    for (int i = 0; i < count; i++)
    {
        Console.Write(a);
        if (i < count - 1) Console.Write(", ");
        int next = a + b;
        a = b;
        b = next;
    }
    Console.WriteLine();
}
// PrintFibonacci(8) → 1, 1, 2, 3, 5, 8, 13, 21
```

---

## Q23. Star Patterns

```csharp
// Pattern 1: Right Triangle
static void RightTriangle(int rows)
{
    for (int i = 1; i <= rows; i++)
    {
        for (int j = 0; j < i; j++)
            Console.Write("*");
        Console.WriteLine();
    }
}
// *
// **
// ***

// Pattern 2: Pyramid
static void Pyramid(int rows)
{
    for (int i = 1; i <= rows; i++)
    {
        for (int s = 0; s < rows - i; s++) Console.Write(" ");    // spaces
        for (int j = 0; j < 2 * i - 1; j++) Console.Write("*");  // stars
        Console.WriteLine();
    }
}
//   *
//  ***
// *****

// Pattern 3: Inverted Triangle
static void InvertedTriangle(int rows)
{
    for (int i = rows; i >= 1; i--)
    {
        for (int j = 0; j < i; j++)
            Console.Write("*");
        Console.WriteLine();
    }
}
// ****
// ***
// **
// *

// Pattern 4: Diamond
static void Diamond(int rows)
{
    for (int i = 1; i <= rows; i++)
    {
        for (int s = 0; s < rows - i; s++) Console.Write(" ");
        for (int j = 0; j < 2 * i - 1; j++) Console.Write("*");
        Console.WriteLine();
    }
    for (int i = rows - 1; i >= 1; i--)
    {
        for (int s = 0; s < rows - i; s++) Console.Write(" ");
        for (int j = 0; j < 2 * i - 1; j++) Console.Write("*");
        Console.WriteLine();
    }
}
```

---

## Q24. What Is the Next Number: 1, 3, 7, 13, ___?

```
Differences: +2, +4, +6, → next difference = +8
Answer: 13 + 8 = 21

Formula: a(n) = n*n - n + 1
  n=1 → 1, n=2 → 3, n=3 → 7, n=4 → 13, n=5 → 21
```

```csharp
static int SeriesValue(int n) => n * n - n + 1;

// Generate terms:
for (int i = 1; i <= 6; i++)
    Console.Write(SeriesValue(i) + " ");
// 1 3 7 13 21 31
```

---

## Q25. Find Duplicate Records in Table (SQL)

```sql
SELECT Name, Department, COUNT(*) AS Count
FROM   Employees
GROUP BY Name, Department
HAVING COUNT(*) > 1;
```

---

## Q26. Find Nth Highest Salary (SQL)

```sql
WITH Ranked AS (
    SELECT EmployeeId, Name, Salary,
        DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 2;
```

---

## Q27. Sort 0s, 1s, 2s — Dutch National Flag

```csharp
static void SortColors(int[] nums)
{
    int low = 0, mid = 0, high = nums.Length - 1;

    while (mid <= high)
    {
        if (nums[mid] == 0)
        {
            int temp    = nums[low];
            nums[low]   = nums[mid];
            nums[mid]   = temp;
            low++; mid++;
        }
        else if (nums[mid] == 1)
        {
            mid++;
        }
        else  // nums[mid] == 2
        {
            int temp    = nums[mid];
            nums[mid]   = nums[high];
            nums[high]  = temp;
            high--;
            // don't increment mid — new element not yet inspected
        }
    }
}

// Input:  [2,1,2,0,1,0,1,0,1]
// Output: [0,0,0,1,1,1,1,2,2]
// O(n) time, O(1) space
```

---

## Q28. Longest Substring Without Repeating Characters (return length)

```csharp
static int LongestSubstringLength(string s)
{
    int[] lastIndex = new int[256];
    for (int i = 0; i < 256; i++) lastIndex[i] = -1;

    int maxLen = 0, start = 0;

    for (int i = 0; i < s.Length; i++)
    {
        if (lastIndex[s[i]] >= start)
            start = lastIndex[s[i]] + 1;

        lastIndex[s[i]] = i;

        int len = i - start + 1;
        if (len > maxLen) maxLen = len;
    }
    return maxLen;
}

// Input: "eghghhgg"  → 3
// Input: "substring" → 8
```

---

## Q29. Maximum Sum of Contiguous Subarray of Size K

```csharp
static int MaxSumSubarrayK(int[] nums, int k)
{
    int windowSum = 0;

    // Sum of first window
    for (int i = 0; i < k; i++)
        windowSum += nums[i];

    int maxSum = windowSum;

    // Slide window: add right element, drop left element
    for (int i = k; i < nums.Length; i++)
    {
        windowSum = windowSum + nums[i] - nums[i - k];
        if (windowSum > maxSum) maxSum = windowSum;
    }
    return maxSum;
}

// Input: [2,1,5,1,3,2], k=3 → 9  (subarray [5,1,3])
```

---

## Q30. Valid Parentheses (Stack as Array)

```csharp
static bool IsValidParentheses(string s)
{
    // Implement stack manually using char array
    char[] stack = new char[s.Length];
    int top = -1;  // top == -1 means empty

    for (int i = 0; i < s.Length; i++)
    {
        char c = s[i];

        if (c == '(' || c == '{' || c == '[')
        {
            stack[++top] = c;   // push
        }
        else
        {
            if (top == -1) return false;  // stack empty, no matching opener

            char popped = stack[top--];   // pop

            if (c == ')' && popped != '(') return false;
            if (c == '}' && popped != '{') return false;
            if (c == ']' && popped != '[') return false;
        }
    }

    return top == -1;   // stack must be empty — every opener was closed
}

// Input: "(){}[]"  → true
// Input: "()(}[]"  → false
// Input: "([)]"    → false
// Input: "{[]}"    → true
```

---

## Techniques Summary

```
Two Pointer:     Reverse string, Palindrome, Move zeros, Reverse array
Sliding Window:  Longest substring, Max sum subarray K
int[256]:        Char frequency, Anagram, First non-repeat, Remove dups
  (replaces Dictionary for char-based problems — O(1) space)
Stack as array:  Valid parentheses — char[] + int top
Modulo trick:    Circular array (Q17), Rotate array (K > n)
Expand center:   Longest palindromic substring
Three pointer:   Sort 0s/1s/2s (Dutch National Flag)
Reverse trick:   Rotate array in O(1) space
i*i <= n:        IsPrime check (replaces Math.Sqrt)
n * -1:          Absolute value (replaces Math.Abs)
(char)(c + 32):  Manual lowercase A-Z (replaces char.ToLower)
new string(char[], offset, length): Build result string from char array
```
