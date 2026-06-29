# Valid Palindrome — LeetCode 125

**Pattern:** Two Pointers
**Difficulty:** Easy
**Date:** 2026-06-29
**LeetCode:** https://leetcode.com/problems/valid-palindrome/

---

## Problem Statement

Given a string, determine if it is a palindrome considering only alphanumeric characters and ignoring cases.

---

## Approach

Use two pointers starting from both ends. Skip non-alphanumeric characters by moving the pointer inward. Compare characters case-insensitively. If any mismatch found, return false.

---

## Solution

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

---

## Complexity

- **Time:** O(n)
- **Space:** O(1)

---

## Key Takeaway

Skip non-alphanumeric chars with inner while loops before comparing. Always normalize case with `ToLower()` before comparison.
