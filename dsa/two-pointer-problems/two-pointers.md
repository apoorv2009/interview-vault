# Two Pointer Problems

**Concept:** Use two pointers to scan from both ends (or same direction) of an array/string.

**When to use:**
- Sorted array + pair/triplet sum
- Palindrome check
- Remove duplicates in-place
- Container with most water type

**Complexities:** Time O(n) | Space O(1)

---

## Table of Contents

| # | Problem | Difficulty | Date Solved |
|---|---------|------------|-------------|
| 1 | [Valid Palindrome — LC 125](#1-valid-palindrome--lc-125) | Easy | 2026-06-29 |
| 2 | [Two Sum II — LC 167](#2-two-sum-ii--lc-167) | Medium | 2026-06-29 |

---

## 1. Valid Palindrome — LC 125

**LeetCode:** https://leetcode.com/problems/valid-palindrome/
**Difficulty:** Easy
**Date:** 2026-06-29

### Problem Statement

Given a string, determine if it is a palindrome considering only alphanumeric characters and ignoring cases.

### Approach

Use two pointers starting from both ends. Skip non-alphanumeric characters by moving the pointer inward. Compare characters case-insensitively. If any mismatch found, return false.

### Solution

```csharp
public class Solution {
    public bool IsPalindrome(string s) {
        var left = 0;
        var right = s.Length - 1;

        while (left < right)
        {
            while (left < right && !Char.IsLetterOrDigit(s[left]))
            {
                left++;
            }
            while (left < right && !Char.IsLetterOrDigit(s[right]))
            {
                right--;
            }
            if (Char.ToLower(s[left]) != Char.ToLower(s[right]))
            {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(1)

### Why O(n) and not O(n²)?

At first glance the nested while loops look like O(n²) but they are not.

The key insight is that `left` and `right` are **shared across all loops** — they never reset.

```
left starts at 0, right starts at n-1
Every iteration of any loop moves left++ or right--
So across the entire execution, left moves at most n times total
And right moves at most n times total
Combined = 2n moves = O(n)
```

Think of it this way — each character is visited **at most once** by left pointer and **at most once** by right pointer. The inner while loops don't restart from 0, they just continue from wherever left/right currently are.

**Contrast with O(n²):** that would happen if left or right **reset** inside the outer loop, causing re-scanning of already visited characters.

### Key Takeaway

Skip non-alphanumeric chars with inner while loops before comparing. Always normalize case with `ToLower()` before comparison.

---

## 2. Two Sum II — LC 167

**LeetCode:** https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/
**Difficulty:** Medium
**Date:** 2026-06-29

### Problem Statement

Given a sorted array of integers in non-decreasing order, return the 1-indexed indices `[index1, index2]` of two numbers that add up to a given target. index1 < index2 and the same element cannot be used twice. There is always exactly one valid solution. Solution must use O(1) additional space.

### Approach

Use two pointers from both ends. Compute sum of both elements. If sum equals target return indices (1-indexed). If sum is greater move right pointer left, if smaller move left pointer right. Array being sorted guarantees this converges to the answer.

### Solution

```csharp
public class Solution {
    public int[] TwoSum(int[] numbers, int target) {
        var left = 0;
        var right = numbers.Length - 1;

        while (left < right)
        {
            var sum = numbers[left] + numbers[right];
            if (sum == target)
            {
                return new int[] { left + 1, right + 1 };
            }
            if (sum > target)
            {
                right--;
            }
            else
            {
                left++;
            }
        }
        return null; // never reached, problem guarantees exactly one solution
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(1) ✓ meets problem constraint

### Why O(n) and not O(n²)?

Each iteration moves either `left` forward or `right` backward — never both stay still and never reset. So across the entire execution left and right together make at most `n` moves total, giving O(n).

### Key Takeaway

Sorted array + pair sum = Two Pointers. Move the pointer that pushes sum in the right direction. `while(left < right)` is safer than `while(true)` even when a solution is guaranteed — it makes termination condition explicit.

---
