# Sliding Window Problems

**Concept:** A window (subarray/substring) slides over data to track max/min/sum/condition without recomputing from scratch.

**When to use:**
- Max/min sum subarray of size K
- Longest substring with condition
- Minimum window substring
- Any contiguous subarray/substring problem

**Complexities:** Time O(n) | Space O(1) or O(k)

---

## Pseudo Code

### Fixed Size Window — Approach 1 (pre-calculate first window)

```
// step 1: build first window
for i = 0 to k-1:
    process nums[i]
result = compute(window)

// step 2: slide from k onwards
for right = k to n-1:
    add nums[right] to window
    remove nums[right - k] from window
    result = max/min/sum(result, window)

return result
```

**When to use:** Need first window result as baseline (sum, max, avg)
**Example:** LC 643 Maximum Average Subarray

---

### Fixed Size Window — Approach 2 (build and slide together)

```
left = 0

for right = 0 to n-1:
    add nums[right] to window       ← always expand

    if window size > k:             ← shrink if exceeded
        remove nums[left]
        left++

    check condition on window

return result
```

**When to use:** Need to check condition during window building too
**Example:** LC 219 Contains Duplicate II

---

### Variable Size Window

```
left = 0
result = 0

for right = 0 to n-1:
    add s[right] to window              ← always expand right

    while window condition is violated:
        remove s[left] from window      ← shrink from left
        left++

    result = max(result, right - left + 1)

return result
```

**When to use:** Problem has a condition to satisfy (no repeats, at most K distinct, etc.)

---

### Why nested while loop is still O(n)?

`left` and `right` never reset — they only move forward.
Each element is added once and removed once = 2n operations = O(n).

---

## Table of Contents

| # | Problem | Difficulty | LeetCode | Date Solved |
|---|---------|------------|----------|-------------|
| 1 | [Best Time to Buy and Sell Stock — LC 121](#1-best-time-to-buy-and-sell-stock--lc-121) | Easy | [LC 121](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | 2026-07-06 |
| 2 | [Maximum Average Subarray I — LC 643](#2-maximum-average-subarray-i--lc-643) | Easy | [LC 643](https://leetcode.com/problems/maximum-average-subarray-i/) | 2026-07-08 |
| 3 | [Contains Duplicate II — LC 219](#3-contains-duplicate-ii--lc-219) | Easy | [LC 219](https://leetcode.com/problems/contains-duplicate-ii/) | 2026-07-08 |
| 4 | [Number of Subarrays of Size K and Average ≥ Threshold — LC 1343](#4-number-of-subarrays-of-size-k-and-average--threshold--lc-1343) | Easy | [LC 1343](https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/) | 2026-07-08 |
| 5 | [Longest Substring Without Repeating Characters — LC 3](#5-longest-substring-without-repeating-characters--lc-3) | Medium | [LC 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | 2026-07-08 |

---

## 1. Best Time to Buy and Sell Stock — LC 121

**LeetCode:** https://leetcode.com/problems/best-time-to-buy-and-sell-stock/
**Difficulty:** Easy
**Date:** 2026-07-06

### Problem Statement

Given an integer array `prices` where `prices[i]` is the price of a stock on the ith day. Choose a single day to buy and a different day in the future to sell. Return the maximum profit. If no profit is possible return `0`.

**Examples:**
```
Input:  prices = [10,1,5,6,7,1]
Output: 6

Input:  prices = [7,6,4,3,1]
Output: 0
```

### Approach

Walk forward once tracking two things — the cheapest price seen so far (buy day) and the max profit seen so far. At each day, if current price is cheaper than min, update the buy day. Otherwise calculate profit if sold today and update max profit. No need to go backwards or restart.

### Solution

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        int maxProfit = 0;
        int minBuyingPrice = prices[0];

        for (int i = 0; i < prices.Length; i++)
        {
            if (minBuyingPrice > prices[i])
            {
                minBuyingPrice = prices[i];  // found cheaper buy day
            }
            else
            {
                int profit = prices[i] - minBuyingPrice;
                if (profit > maxProfit)
                {
                    maxProfit = profit;
                }
            }
        }
        return maxProfit;
    }
}
```

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1)

### Why O(n) and not O(n²)?

Brute force fixes every buy day and checks all future sell days — two nested loops = O(n²). Sliding window walks forward once, always buying at the cheapest price seen so far. One loop, no restarts = O(n).

### Key Takeaway

You don't need to try every buy day. Just track `minPrice` as you go — the cheapest day seen so far is always the best buy day for any future sell day. Single pass is enough.

---

## 2. Maximum Average Subarray I — LC 643

**LeetCode:** https://leetcode.com/problems/maximum-average-subarray-i/
**Difficulty:** Easy
**Date:** 2026-07-08

### Problem Statement

Given an integer array `nums` and an integer `k`, find a contiguous subarray of length exactly `k` that has the maximum average value. Return that maximum average.

**Examples:**
```
Input:  nums = [1,12,-5,-6,50,3], k = 4
Output: 12.75  → [12,-5,-6,50] avg = 51/4 = 12.75

Input:  nums = [5], k = 1
Output: 5.0
```

### Approach

Calculate sum of first `k` elements as the initial window. Then slide one step at a time — add the incoming right element and remove the outgoing left element using `nums[right] - nums[right - k]`. Track maximum sum and divide by `k` at the end.

### Solution

```csharp
public class Solution {
    public double FindMaxAverage(int[] nums, int k) {
        int windowSum = 0;

        for (int i = 0; i < k; i++)
            windowSum += nums[i];

        int maxSum = windowSum;

        for (int right = k; right < nums.Length; right++)
        {
            windowSum += nums[right];
            windowSum -= nums[right - k];
            maxSum = Math.Max(maxSum, windowSum);
        }

        return (double)maxSum / k;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(1)

### Why O(n) and not O(n×k)?

Brute force recalculates sum of k elements for every window = O(n×k). Sliding window reuses the previous sum — just adds one element and removes one = O(1) per slide = O(n) total.

### Key Takeaway

Fixed window = calculate first window once, then slide by adding `nums[right]` and removing `nums[right - k]`. No need to recompute the whole window each time.

---

## 3. Contains Duplicate II — LC 219

**LeetCode:** https://leetcode.com/problems/contains-duplicate-ii/
**Difficulty:** Easy
**Date:** 2026-07-08

### Problem Statement

Given an integer array `nums` and an integer `k`, return `true` if there are two equal elements in the array whose index difference is at most `k`.

**Examples:**
```
Input:  nums = [1,2,3,1], k = 3
Output: true   → 1 at index 0 and 3, difference = 3 ≤ k

Input:  nums = [1,2,3,1,2,3], k = 2
Output: false  → all duplicates are more than 2 apart
```

### Approach

Maintain a sliding window of size k using a HashSet. At each step check if current element already exists in the window — if yes return true (duplicate within distance k). If window grows beyond k, remove the leftmost element. Use Approach 2 (build and slide together) since we need to check condition during window building too.

### Solution

```csharp
public class Solution {
    public bool ContainsNearbyDuplicate(int[] nums, int k)
    {
        var seen = new HashSet<int>();
        int left = 0;

        for (int i = 0; i < nums.Length; i++)
        {
            if (seen.Contains(nums[i]))
                return true;

            seen.Add(nums[i]);

            if (seen.Count > k)
            {
                seen.Remove(nums[left]);
                left++;
            }
        }
        return false;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(k) — HashSet holds at most k elements

### Key Takeaway

"Index difference at most k" = fixed window of size k. Use HashSet to check duplicates in O(1). Window size > k → remove leftmost. This uses Approach 2 (build + slide in one loop) since duplicates can appear during window building.

---

## 4. Number of Subarrays of Size K and Average ≥ Threshold — LC 1343

**LeetCode:** https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/
**Difficulty:** Easy
**Date:** 2026-07-08

### Problem Statement

Given an integer array `arr`, an integer `k` and an integer `threshold`, return the number of subarrays of size `k` whose average is greater than or equal to `threshold`.

**Examples:**
```
Input:  arr = [2,2,2,2,5,5,5,8], k = 3, threshold = 4
Output: 3

Input:  arr = [1,1,1,1,1], k = 1, threshold = 0
Output: 5
```

### Approach

Calculate sum of first k elements. Check if average >= threshold, increment count. Then slide — add incoming, remove outgoing, check condition each time. Use Approach 1 (pre-calculate first window) since we need a baseline sum to start from.

### Solution

```csharp
public class Solution {
    public int NumOfSubarrays(int[] arr, int k, int threshold)
    {
        int windowSum = 0;
        int count = 0;

        for (int i = 0; i < k; i++)
            windowSum += arr[i];

        if (windowSum / k >= threshold)
            count++;

        for (int i = k; i < arr.Length; i++)
        {
            windowSum += arr[i];
            windowSum -= arr[i - k];

            if (windowSum / k >= threshold)
                count++;
        }
        return count;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(1)

### Key Takeaway

Use `>=` not `>` when problem says "greater than or equal to". Compare `windowSum / k >= threshold` — no need for HashSet, just a counter. Classic Approach 1 fixed window.

---

## 5. Longest Substring Without Repeating Characters — LC 3

**LeetCode:** https://leetcode.com/problems/longest-substring-without-repeating-characters/
**Difficulty:** Medium
**Date:** 2026-07-08

### Problem Statement

Given a string `s`, find the length of the longest substring without duplicate characters.

**Examples:**
```
Input:  s = "zxyzxyz"
Output: 3  → "xyz"

Input:  s = "xxxx"
Output: 1  → "x"

Input:  s = "abcabcbb"
Output: 3  → "abc"
```

### Approach

Variable size window using HashSet. Expand right on every step. When duplicate found, shrink from left (remove s[left], left++) until duplicate is gone. Track max window size seen so far.

### Solution

```csharp
public class Solution {
    public int LengthOfLongestSubstring(string s)
    {
        var seen = new HashSet<char>();
        int left = 0;
        int maxLength = 0;

        for (int i = 0; i < s.Length; i++)
        {
            while (seen.Contains(s[i]))
            {
                seen.Remove(s[left]);  // shrink from left
                left++;
            }
            seen.Add(s[i]);
            if (maxLength < seen.Count())
            {
                maxLength = seen.Count();
            }
        }
        return maxLength;
    }
}
```

### Complexity

- **Time:** O(n)
- **Space:** O(k) — k = size of character set in window

### Why O(n) and not O(n²)?

The while loop looks like O(n²) but left and right never reset — each moves forward at most n times total. Every character is added once and removed once = 2n operations = O(n).

### Key Takeaway

Variable window = expand right always, shrink left when condition violated. Always remove `s[left]` not `s[right]` when shrinking. Window size = `right - left + 1` or `seen.Count()`.

---
