# Search Problems

---

# Linear Search

**Concept:** Scan every element one by one until you find what you need. No sorting required.

**When to use:**
- Array is unsorted
- Need to visit every element anyway
- Simple existence / count / filter problems

**Complexity:** Time O(n) | Space O(1)

## Pseudo Code

```
for i = 0 to n-1:
    if condition(arr[i]):
        process / count / overwrite
return result
```

---

## Table of Contents

| # | Problem | Difficulty | LeetCode | Date Solved |
|---|---------|-----------|----------|-------------|
| 1 | [Remove Element — LC 27](#1-remove-element--lc-27) | Easy | [LC 27](https://leetcode.com/problems/remove-element/) | 2026-07-26 |
| 2 | [Find Numbers with Even Number of Digits — LC 1295](#2-find-numbers-with-even-number-of-digits--lc-1295) | Easy | [LC 1295](https://leetcode.com/problems/find-numbers-with-even-number-of-digits/) | |

---

## 1. Remove Element — LC 27

**LeetCode:** https://leetcode.com/problems/remove-element/
**Difficulty:** Easy
**Date:** 2026-07-26

### Problem Statement

Given an integer array `nums` and an integer `val`, remove all occurrences of `val` in-place. Return the number of elements that are not equal to `val`.

**Examples:**
```
Input:  nums = [3, 2, 2, 3], val = 3
Output: 2,  nums = [2, 2, _, _]

Input:  nums = [0, 1, 2, 2, 3, 0, 4, 2], val = 2
Output: 5,  nums = [0, 1, 3, 0, 4, _, _, _]
```

### Approach

Use a write pointer `k` starting at 0. Walk through the array — whenever current element is not `val`, write it to `nums[k]` and advance `k`. Skip when it equals `val`. At the end `k` is the count of valid elements.

### Solution

```csharp
public static int LinearSearch(int[] input, int val)
{
    int count = 0;
    for (int i = 0; i < input.Length; i++)
    {
        if (input[i] != val)
        {
            input[count] = input[i];
            count++;
        }
    }
    return count;
}
```

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1) — in-place, no extra array

### Key Takeaway

Arrays are fixed size in C# — you can't delete. Instead overwrite valid elements from the front using a write pointer. The elements after index `k` are garbage and ignored.

---

## 2. Find Numbers with Even Number of Digits — LC 1295

**LeetCode:** https://leetcode.com/problems/find-numbers-with-even-number-of-digits/
**Difficulty:** Easy
**Date:** 2026-07-26

### Problem Statement

Given an array `nums` of integers, return how many of them contain an **even number of digits**.

**Examples:**
```
Input:  nums = [12, 345, 2, 6, 7896]
Output: 2   → 12 (2 digits), 7896 (4 digits)

Input:  nums = [555, 901, 482, 1771]
Output: 1   → 1771 (4 digits)
```

### Solution

```csharp
public static int LinearSearch(int[] input)
{
    int count = 0;
    for (int i = 0; i < input.Length; i++)
    {
        var numberLength = input[i].ToString().Length;
        if (numberLength % 2 == 0)
        {
            count++;
        }
    }
    return count;
}
```

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1)

### Key Takeaway

Convert to string to get digit count in one line. Even digit count = `length % 2 == 0`.

---

---

# Binary Search

**Concept:** On a **sorted** array, compare target with the middle element. Eliminate half the search space each step.

**When to use:**
- Array is sorted
- Find target / find boundary / find insert position
- "Find first/last position" problems

**Complexity:** Time O(log n) | Space O(1)

## Pseudo Code

```
left = 0, right = n - 1

while left <= right:
    mid = left + (right - left) / 2

    if arr[mid] == target:
        return mid
    else if arr[mid] < target:
        left = mid + 1      ← search right half
    else:
        right = mid - 1     ← search left half

return -1   ← not found
```

**Why `left + (right - left) / 2` and not `(left + right) / 2`?**
Avoids integer overflow when left and right are both large.

---

## Table of Contents

| # | Problem | Difficulty | LeetCode | Date Solved |
|---|---------|-----------|----------|-------------|
| 1 | [Binary Search — LC 704](#1-binary-search--lc-704) | Easy | [LC 704](https://leetcode.com/problems/binary-search/) | |
| 2 | [Search Insert Position — LC 35](#2-search-insert-position--lc-35) | Easy | [LC 35](https://leetcode.com/problems/search-insert-position/) | |

---

## 1. Binary Search — LC 704

**LeetCode:** https://leetcode.com/problems/binary-search/
**Difficulty:** Easy
**Date:**

### Problem Statement

Given a sorted array of integers `nums` and a target, return the index of target. If not found return `-1`.

**Examples:**
```
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4

Input:  nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
```

### Solution

```csharp
// paste solution here
```

### Complexity

- **Time:** O(log n)
- **Space:** O(1)

---

## 2. Search Insert Position — LC 35

**LeetCode:** https://leetcode.com/problems/search-insert-position/
**Difficulty:** Easy
**Date:**

### Problem Statement

Given a sorted array and a target, return the index if found. If not found, return the index where it **would be inserted** in order.

**Examples:**
```
Input:  nums = [1, 3, 5, 6], target = 5
Output: 2

Input:  nums = [1, 3, 5, 6], target = 2
Output: 1

Input:  nums = [1, 3, 5, 6], target = 7
Output: 4
```

### Solution

```csharp
// paste solution here
```

### Complexity

- **Time:** O(log n)
- **Space:** O(1)

---
