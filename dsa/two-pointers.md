# Two Pointer Problems

**Concept:** Use two pointers to scan from both ends (or same direction) of an array/string.

**When to use:**
- Sorted array + pair/triplet sum
- Palindrome check
- Remove duplicates in-place
- Container with most water type

**Complexities:** Time O(n) | Space O(1)

---

## Pseudo Code

### Opposite Ends (sorted array / palindrome)

```
left = 0
right = n - 1

while left < right:
    if condition met:
        return or record result
    else if need bigger value:
        left++
    else:
        right--

return result
```

**When to use:** Sorted array, pair sum, palindrome check

---

### Same Direction (fast/slow or partition)

```
left = 0

for right = 0 to n-1:
    if condition met:
        do something with s[left] and s[right]
        left++

return result
```

**When to use:** Remove duplicates, partition array, move zeroes

---

### Why O(n) even with nested loops?

`left` and `right` never reset — each moves forward at most n times total.
Combined moves = 2n = O(n).

---

## Table of Contents

| # | Problem | Difficulty | LeetCode | Date Solved |
|---|---------|------------|----------|-------------|
| 1 | [Valid Palindrome — LC 125](#1-valid-palindrome--lc-125) | Easy | [LC 125](https://leetcode.com/problems/valid-palindrome/) | 2026-06-29 |
| 2 | [Two Sum II — LC 167](#2-two-sum-ii--lc-167) | Medium | [LC 167](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) | 2026-06-29 |
| 3 | [3Sum — LC 15](#3-3sum--lc-15) | Medium | [LC 15](https://leetcode.com/problems/3sum/) | 2026-06-29 |
| 4 | [Container With Most Water — LC 11](#4-container-with-most-water--lc-11) | Medium | [LC 11](https://leetcode.com/problems/container-with-most-water/) | 2026-06-29 |
| 5 | [Trapping Rain Water — LC 42](#5-trapping-rain-water--lc-42) | Hard | [LC 42](https://leetcode.com/problems/trapping-rain-water/) | - |

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

## 3. 3Sum — LC 15

**LeetCode:** https://leetcode.com/problems/3sum/
**Difficulty:** Medium
**Date:** 2026-06-29

### Problem Statement

Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `nums[i] + nums[j] + nums[k] == 0` and all indices i, j, k are distinct. The output must not contain duplicate triplets.

**Examples:**
```
Input:  nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

Input:  nums = [0,1,1]
Output: []

Input:  nums = [0,0,0]
Output: [[0,0,0]]
```

**Constraints:**
- 3 <= nums.length <= 1000
- -10⁵ <= nums[i] <= 10⁵

### Approach

Sort the array first. Fix one element at index `i` and run Two Sum II on the remaining subarray `[i+1, n-1]` with target `-nums[i]`. Skip duplicate values of `i` to avoid duplicate triplets. After finding a triplet, skip duplicate values of `left` and `right` as well.

### Solution

```csharp
public class Solution {
    public List<List<int>> ThreeSum(int[] nums) 
    {   
        var result = new List<List<int>>();    
        Array.Sort(nums);

        for (int i = 0; i < nums.Length - 1; i++)
        {   
            // skip duplicate i values
            if (i > 0 && nums[i] == nums[i - 1])
                continue;

            int left = i + 1;
            int right = nums.Length - 1;    
           
            while (left < right)
            {
                int sum = nums[i] + nums[left] + nums[right];

                if (sum == 0)
                {
                    result.Add(new List<int>() { nums[i], nums[left], nums[right] });
                    left++;
                    right--;

                    // skip duplicate left values
                    while (left < right && nums[left] == nums[left - 1])
                        left++;

                    // skip duplicate right values
                    while (left < right && nums[right] == nums[right + 1])
                        right--;
                }
                else if (sum > 0)
                {
                    right--;
                }
                else
                {
                    left++;
                }
            }
        }
        return result;
    }
}
```

### Complexity

- **Time:** O(n²) — outer loop O(n) × inner two pointer O(n)
- **Space:** O(1) extra space (output list not counted)

### Why O(n²) and not O(n³)?

Sorting is O(n log n). The outer `for` loop runs O(n) times. For each `i`, the inner `while(left < right)` is a single linear scan — left and right together make at most `n` moves total without resetting. So it's O(n) × O(n) = O(n²), not O(n³) which would happen if we used three nested independent loops.

### Key Takeaway

3Sum = Sort + fix one element + Two Sum II on the rest. Three places to skip duplicates: after `i`, after `left`, after `right`. Always compare total sum against 0, not individual elements against each other.

---

## 4. Container With Most Water — LC 11

**LeetCode:** https://leetcode.com/problems/container-with-most-water/
**Difficulty:** Medium
**Date:** 2026-06-29

### Problem Statement

Given an integer array `heights` where `heights[i]` represents the height of the ith bar, choose any two bars to form a container. Return the maximum amount of water a container can store.

**Example:**
```
Input:  heights = [1,8,6,2,5,4,8,3,7]
Output: 49
```

**Note:** Index = horizontal position of bar, Value = height of bar. Width between two bars = difference of their indices, not their values.

### Approach

Start pointers at both ends (maximum width). At each step calculate area using `min(heights[left], heights[right]) × (right - left)`. Always move the shorter wall inward — moving the taller wall can never improve the area since the shorter wall still limits height and width is also decreasing.

### Solution

```csharp
public class Solution {
    public int MaxArea(int[] heights) 
    {
        var left = 0;
        var right = heights.Length - 1;
        int maxArea = 0;

        while (left < right)
        {
            int area = Math.Min(heights[left], heights[right]) * (right - left);
            if (area > maxArea)
            {
                maxArea = area;           
            }
            if (heights[left] < heights[right])
            {
                left++;
            }
            else
            {
                right--;
            }          
        }
        return maxArea;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(1)

### Key Takeaway

Always move the **shorter** pointer inward. Moving the taller pointer can never improve the answer — shorter wall limits height AND width is shrinking. Index difference = width, not value difference.

---

## 5. Trapping Rain Water — LC 42

**LeetCode:** https://leetcode.com/problems/trapping-rain-water/
**Difficulty:** Hard
**Date:** -

### Problem Statement

Given an array `height` where `height[i]` represents the height of a bar, compute how much water can be trapped after raining.

**Examples:**
```
Input:  height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6

Input:  height = [4,2,0,3,2,5]
Output: 9
```

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

### Key Takeaway

_To be added_

---
