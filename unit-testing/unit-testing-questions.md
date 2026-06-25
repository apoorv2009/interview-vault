# Unit Testing — Interview Preparation

**Project Context**: Capital Access, S&P Global — NUnit, xUnit, Moq, CI/CD via Azure DevOps

---

## AAA Principle (Arrange, Act, Assert)

The standard structure for every unit test:

```csharp
[Test]
public async Task CreateEngagement_WhenValidRequest_ReturnsCreatedEngagement()
{
    // ARRANGE — set up dependencies, input data, expected output
    var tenantId    = "spg-001";
    var companyId   = "c44";
    var mockRepo    = new Mock<IEngagementRepository>();
    var mockBus     = new Mock<IServiceBus>();
    var service     = new EngagementService(mockRepo.Object, mockBus.Object);

    var request = new CreateEngagementRequest
    {
        TenantId  = tenantId,
        CompanyId = companyId,
        Status    = "Pending"
    };

    mockRepo.Setup(r => r.AddAsync(It.IsAny<EngagementActivity>()))
            .ReturnsAsync(new EngagementActivity { Id = 1, TenantId = tenantId });

    // ACT — call the method under test
    var result = await service.CreateAsync(request);

    // ASSERT — verify the outcome
    Assert.That(result.Id, Is.EqualTo(1));
    Assert.That(result.TenantId, Is.EqualTo(tenantId));
    mockBus.Verify(b => b.PublishAsync(It.IsAny<EngagementCreatedEvent>()), Times.Once);
}
```

---

## Test Pyramid

```
            /\
           /  \        E2E Tests (few)
          /────\       → Slow, expensive, brittle
         /      \      → Selenium, Playwright
        /────────\     Integration Tests (some)
       /          \    → DB, HTTP, real dependencies
      /────────────\   → WebApplicationFactory, TestContainers
     /              \  Unit Tests (many) ← FOUNDATION
    /────────────────\ → Fast, isolated, mocked dependencies
   /                  \→ NUnit, xUnit, Moq
```

**Rule: Most tests should be unit tests — fast, isolated, run on every commit.**

Why pyramid matters: E2E tests are 100× slower and 10× harder to maintain than unit tests. If you invert the pyramid (lots of E2E, few unit), your CI/CD pipeline takes hours and breaks constantly.

---

## Types of Testing

| Type | What it tests | Speed | Dependencies | Tools |
|------|--------------|-------|--------------|-------|
| **Unit** | Single class/method in isolation | Milliseconds | All mocked | NUnit, xUnit, Moq |
| **Integration** | Multiple components together | Seconds | Real DB / HTTP | WebApplicationFactory, TestContainers |
| **E2E (Functional)** | Full user flow via UI | Minutes | Full system | Playwright, Selenium |
| **Regression** | Ensure old features still work | Varies | Varies | Same as above |
| **Performance** | Latency, throughput under load | Minutes | Full system | k6, JMeter, NBomber |
| **Smoke** | Critical paths after deployment | Seconds | Full system | Postman, custom scripts |
| **Contract** | API contract between services | Fast | Mock | Pact |

---

## NUnit Basics

```csharp
using NUnit.Framework;

[TestFixture]           // marks class as test class
public class EngagementServiceTests
{
    private Mock<IEngagementRepository> _mockRepo;
    private EngagementService _service;

    [SetUp]             // runs before EACH test
    public void SetUp()
    {
        _mockRepo = new Mock<IEngagementRepository>();
        _service  = new EngagementService(_mockRepo.Object);
    }

    [TearDown]          // runs after EACH test
    public void TearDown() { }

    [OneTimeSetUp]      // runs once before all tests in class
    public void Init() { }

    [Test]
    public void GetById_WhenExists_ReturnsEngagement()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(1))
                 .ReturnsAsync(new EngagementActivity { Id = 1 });
        // Act
        var result = _service.GetByIdAsync(1).Result;
        // Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Id, Is.EqualTo(1));
    }

    [TestCase(1, "Pending")]
    [TestCase(2, "Completed")]
    [TestCase(3, "Cancelled")]
    public void GetStatus_ReturnsCorrectStatus(int id, string expectedStatus)
    {
        // Tests run 3 times with different parameters ✅
        _mockRepo.Setup(r => r.GetByIdAsync(id))
                 .ReturnsAsync(new EngagementActivity { Id = id, Status = expectedStatus });
        var result = _service.GetByIdAsync(id).Result;
        Assert.That(result.Status, Is.EqualTo(expectedStatus));
    }

    [Test]
    public void GetById_WhenNotFound_ThrowsNotFoundException()
    {
        _mockRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((EngagementActivity?)null);
        Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(99));
    }
}
```

---

## Mocking with Moq

```csharp
var mock = new Mock<IEngagementRepository>();

// Setup return value
mock.Setup(r => r.GetByIdAsync(1))
    .ReturnsAsync(new EngagementActivity { Id = 1 });

// Setup with any argument
mock.Setup(r => r.AddAsync(It.IsAny<EngagementActivity>()))
    .ReturnsAsync(new EngagementActivity { Id = 99 });

// Throw exception
mock.Setup(r => r.GetByIdAsync(-1))
    .ThrowsAsync(new ArgumentException("Invalid ID"));

// Verify a method was called
mock.Verify(r => r.AddAsync(It.IsAny<EngagementActivity>()), Times.Once);
mock.Verify(r => r.GetByIdAsync(1), Times.Exactly(2));
mock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
```

---

## Role of Unit Tests in CI/CD

```
Developer pushes code
        ↓
CI Pipeline triggers (Azure DevOps / GitHub Actions)
        ↓
Build (dotnet build)
        ↓
Unit Tests run (dotnet test) ← GATE: fails = build blocked ✅
        ↓
Integration Tests run
        ↓
Code Coverage check (must be > 80%) ← GATE
        ↓
Static Analysis (SonarQube)
        ↓
Docker build + push to registry
        ↓
Deploy to Dev environment
        ↓
Smoke Tests
        ↓
Deploy to Production (manual gate or auto)
```

**Capital Access:** Azure DevOps pipeline runs all unit tests on every PR. Build fails if tests fail or coverage drops below 80%. No code merges to main without green tests.

---

## Code Coverage

**What it measures:** % of production code executed by tests.

```bash
dotnet test --collect:"XPlat Code Coverage"
reportgenerator -reports:coverage.xml -targetdir:coverage-report -reporttypes:Html
```

| Coverage Type | What it measures |
|--------------|-----------------|
| **Line coverage** | % of lines executed |
| **Branch coverage** | % of if/else branches taken |
| **Method coverage** | % of methods called |

```csharp
// 100% line coverage doesn't mean fully tested!
public int Divide(int a, int b) => a / b;

[Test]
public void Divide_Works() => Assert.That(Divide(10, 2), Is.EqualTo(5));
// 100% line coverage ✅ but DivideByZeroException not tested ❌
// Branch + edge case coverage is more meaningful than line coverage %
```

**Target: 80%+ meaningful coverage, not 100% for its own sake.**
Focus coverage on business logic, not getters/setters/DTOs.

---

## What to Test vs What Not to Test

```
✅ Test:                          ❌ Don't test:
Business logic                    Getters / setters
Edge cases (null, empty, min/max) Auto-generated code
Error handling / exceptions       Framework code (EF Core internals)
Service interactions via mocks    Trivial one-liners (return x + y)
Validation rules                  Third-party library behaviour
```
