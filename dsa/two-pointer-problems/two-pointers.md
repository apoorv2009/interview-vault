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
