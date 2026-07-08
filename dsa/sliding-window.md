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

| # | Problem | Difficulty | Date Solved |
|---|---------|------------|-------------|
| 1 | [Best Time to Buy and Sell Stock — LC 121](#1-best-time-to-buy-and-sell-stock--lc-121) | Easy | 2026-07-06 |
| 2 | [Maximum Average Subarray I — LC 643](#2-maximum-average-subarray-i--lc-643) | Easy | 2026-07-08 |
| 3 | [Contains Duplicate II — LC 219](#3-contains-duplicate-ii--lc-219) | Easy | 2026-07-08 |

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
