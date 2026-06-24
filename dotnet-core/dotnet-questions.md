# .NET Backend — Interview Preparation

**Project Context**: Capital Access, S&P Global — Azure microservices, .NET 8, C# 12, EF Core 8
**Audience Level**: Senior Developer (5+ years)
**Last Updated**: June 2026

> Every answer is framed through the Capital Access project so you can tell real stories in the interview, not recite textbook definitions.

---

## Table of Contents

1. [OOP Fundamentals](#1-oop-fundamentals)
2. [C# Language Features](#2-c-language-features)
3. [SOLID Principles](#3-solid-principles)
4. [.NET Core & ASP.NET Core](#4-net-core--aspnet-core)
5. [Entity Framework Core](#5-entity-framework-core)
6. [LINQ](#6-linq)

---

## 1. OOP Fundamentals

---

### Q1. [Topic: OOP] [EPAM] What are the four pillars of OOP? Explain each with a real project example.

The four pillars are **Encapsulation, Abstraction, Inheritance, and Polymorphism**.

---

**Encapsulation** — bundle data and behaviour in one class; hide internal state so it can only be changed through controlled methods.

```csharp
// Capital Access — EngagementActivity in the IR Engagement Service
public class EngagementActivity
{
    public EngagementStatus Status { get; private set; }   // private setter — data protected
    public DateTime? CompletedAt { get; private set; }
    public string? OutcomeNotes { get; private set; }

    // The ONLY way to complete a meeting — rules enforced here
    public void Complete(string outcomeNotes)
    {
        if (Status != EngagementStatus.Scheduled)
            throw new InvalidOperationException("Only scheduled meetings can be completed.");
        if (string.IsNullOrWhiteSpace(outcomeNotes))
            throw new ArgumentException("Outcome notes are required.");

        Status = EngagementStatus.Completed;
        CompletedAt = DateTime.UtcNow;   // set together atomically — no broken state
        OutcomeNotes = outcomeNotes;
    }
}

// Without encapsulation — broken state is possible:
activity.Status = EngagementStatus.Completed; // ❌ compiler error — private setter
activity.CompletedAt = null;                  // ❌ can't touch directly
```

> **Interview line**: "In our Engagement Service, EngagementActivity has private setters on all state fields. The only way to mark a meeting completed is through `Complete()`, which enforces outcome notes are present and sets the timestamp atomically. This prevents broken state like a meeting marked completed with no timestamp."

---

**Abstraction** — hide implementation complexity; expose only what the caller needs to know.

```csharp
// Capital Access — INotificationSender abstracts email vs in-app delivery
public interface INotificationSender
{
    Task SendAsync(string recipientId, string message); // caller only sees this
}

public class EmailNotificationSender : INotificationSender
{
    public async Task SendAsync(string recipientId, string message)
    {
        // SMTP setup, HTML template rendering, retry logic, bounce handling — all hidden
    }
}

public class InAppNotificationSender : INotificationSender
{
    public async Task SendAsync(string recipientId, string message)
    {
        // SignalR hub call, delivery tracking, read receipts — all hidden
    }
}

// Caller — no idea it's email or in-app
public class OwnershipAlertHandler
{
    private readonly INotificationSender _sender;

    public async Task Notify(string userId, string message)
    {
        await _sender.SendAsync(userId, message); // same call regardless of channel
    }
}
```

> **Interview line**: "We abstract notification delivery behind INotificationSender. The handler that reacts to ownership change events calls SendAsync and has no idea whether it triggers an email or an in-app notification. Adding a new delivery channel means writing a new implementation — nothing else changes."

---

**Inheritance** — a child class inherits fields and behaviour from a parent; avoids repeating common code.

```csharp
// Capital Access — BaseEntity carries fields every entity needs
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public string TenantId { get; protected set; } = string.Empty;
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; protected set; } = DateTime.UtcNow;
    public bool IsDeleted { get; protected set; }

    public void SoftDelete()
    {
        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }
}

// Children inherit everything — no repetition
public class EngagementActivity : BaseEntity
{
    public ActivityType ActivityType { get; private set; }
    public EngagementStatus Status { get; private set; }
    // Id, TenantId, CreatedAt, UpdatedAt, IsDeleted, SoftDelete() — all inherited ✅
}

public class FollowUpTask : BaseEntity
{
    public string TaskType { get; private set; }
    public DateTime DueDate { get; private set; }
    // Same inherited fields — without repeating them ✅
}
```

> **Interview line**: "Every entity in our Engagement Service inherits from BaseEntity, which provides Id, TenantId, timestamps, and SoftDelete(). This is also why our EF Core global query filters work uniformly — IsDeleted and TenantId are always present on every entity."

---

**Polymorphism** — one interface, many implementations; same method call behaves differently at runtime.

Two types:
- **Runtime polymorphism** (overriding) — child overrides parent's virtual method; resolved at runtime
- **Compile-time polymorphism** (overloading) — same method name, different parameters; resolved at compile time

```csharp
// Capital Access — runtime polymorphism in the Report Worker
public interface IReportGenerator
{
    string Format { get; }
    Task<byte[]> GenerateAsync(ReportData data);
}

public class PdfReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data) { /* QuestPDF logic */ }
}

public class ExcelReportGenerator : IReportGenerator
{
    public string Format => "excel";
    public async Task<byte[]> GenerateAsync(ReportData data) { /* EPPlus logic */ }
}

// Orchestrator — same call, different behaviour at runtime
public class ReportOrchestrator
{
    private readonly IEnumerable<IReportGenerator> _generators;

    public async Task<byte[]> GenerateAsync(ReportData data, string format)
    {
        var generator = _generators.First(g => g.Format == format);
        return await generator.GenerateAsync(data); // polymorphic — no if/else ✅
    }
}

// Compile-time polymorphism (overloading):
public class EngagementRepository
{
    public Task<EngagementActivity?> GetByIdAsync(Guid id) { ... }
    public Task<EngagementActivity?> GetByIdAsync(Guid id, string tenantId) { ... }
    public Task<List<EngagementActivity>> GetByIdAsync(List<Guid> ids) { ... }
}
```

> **Interview line**: "In our Report Worker, we use runtime polymorphism through IReportGenerator. The orchestrator calls GenerateAsync() without any if/else for PDF vs Excel — the DI container resolves the correct implementation. Adding CSV means adding a new class. The orchestrator doesn't change."

---

### Q2. [Topic: OOP] [EPAM] Why do Encapsulation and Abstraction sound similar? What is the real difference?

Both involve "hiding" something — but they hide different things.

| | What it hides | Purpose |
|---|---|---|
| **Encapsulation** | **Data** (fields, internal state) | Protect state — control WHO can read/write it |
| **Abstraction** | **Complexity** (how it works) | Simplify the interface — control WHAT the caller needs to know |

**ATM analogy:**
- **Encapsulation** → your PIN and account balance are private data sealed inside the bank's system. You cannot touch the balance field directly — you use controlled methods (withdraw, deposit).
- **Abstraction** → when you press "Withdraw ₹5000", the SMTP calls, fraud checks, ledger updates, and cash dispenser logic are all hidden from you. You only see the button.

**In the same class — both happen simultaneously:**
```csharp
public class EngagementActivity
{
    private string _outcomeNotes;         // Encapsulation: data is private

    public void Complete(string notes)
    {
        ValidateNotes(notes);             // Abstraction: caller doesn't know about validation
        _outcomeNotes = notes;
        Status = EngagementStatus.Completed;
    }

    private void ValidateNotes(string notes) { ... } // hidden complexity
}
```

`_outcomeNotes` is encapsulation (data protection). `ValidateNotes` being private is abstraction (complexity hiding). Same class, two different things hidden.

> **Interview line**: "Encapsulation hides data — who can read or write internal state. Abstraction hides implementation — what complexity the caller needs to understand. They feel similar because both hide something. In EngagementActivity, private setters are encapsulation, and the Complete() method hiding its validation rules is abstraction."

---

### Q3. [Topic: OOP] [EPAM] When do you use an Abstract Class vs an Interface?

| | Abstract Class | Interface |
|---|---|---|
| Has fields? | Yes | No |
| Has method bodies? | Yes (`virtual` methods) | Yes (default implementations, C# 8+) |
| Has constructors? | Yes | No |
| Multiple inheritance? | No — one parent class only | Yes — implement many interfaces |
| Use when | Shared implementation + common base behaviour | Pure contract / capability across unrelated classes |

```csharp
// ABSTRACT CLASS — shared implementation for related classes
public abstract class BaseAzureService
{
    protected readonly ILogger _logger;
    protected readonly string _tenantId;

    protected BaseAzureService(ILogger logger, ICurrentTenantService tenantService)
    {
        _logger = logger;
        _tenantId = tenantService.TenantId; // shared setup all services need
    }

    protected void LogServiceCall(string operation)
        => _logger.LogInformation("[{Tenant}] {Operation}", _tenantId, operation);

    public abstract Task<bool> HealthCheckAsync(); // each service implements its own
}

public class EngagementService : BaseAzureService
{
    public override async Task<bool> HealthCheckAsync()
        => await _context.Database.CanConnectAsync();
}

// INTERFACE — capability shared by unrelated classes
public interface IExportable
{
    Task<byte[]> ExportAsync(ExportFormat format);
}

public class EngagementActivity : BaseEntity, IExportable { ... }  // entity
public class OwnershipReport : IExportable { ... }                 // report — unrelated to entity
```

> **Rule**: use abstract class when multiple related classes share real code. Use interface when expressing a capability that unrelated classes can implement.

---

## 3. SOLID Principles

---

### Q4. [Topic: SOLID] [EPAM] Explain the Single Responsibility Principle with a real example.

**Definition**: A class should have one job and one reason to change.

```csharp
// ❌ Violates SRP — one class does database work, email, Service Bus, and logging
public class EngagementService
{
    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _context.EngagementActivities.FindAsync(id); // DB
        activity.Complete(notes);
        await _context.SaveChangesAsync();

        var smtp = new SmtpClient("smtp.sendgrid.com");                   // Email
        await smtp.SendMailAsync(...);

        var sbClient = new ServiceBusClient(connectionString);            // Service Bus
        await sbClient.SendMessageAsync(...);

        File.AppendAllText("audit.log", $"{id} completed");              // Logging
    }
}
// Changes when: DB schema changes, email provider changes, Service Bus changes, log format changes
// Four reasons to change = four responsibilities
```

```csharp
// ✅ SRP — each class has exactly one job
public class EngagementService        // job: business logic only
{
    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _repo.GetByIdAsync(id);
        activity.Complete(notes);
        await _repo.SaveAsync();
        await _publisher.PublishAsync(new EngagementCompletedEvent(id));
    }
}

public class EngagementRepository     // job: data access only
public class ServiceBusEventPublisher // job: event publishing only
public class NotificationService      // job: notification sending only
```

> **Interview line**: "In our Engagement Service we split the work into focused classes: the service owns business logic, a repository owns data access, a publisher owns Service Bus events, and a notification service owns email. When SendGrid changed their API, we updated exactly one class. Nothing else changed."

---

### Q5. [Topic: SOLID] [EPAM] Explain the Open/Closed Principle with a real example.

**Definition**: Open for extension, closed for modification. Add new behaviour by writing new code — not by editing existing code.

```csharp
// ❌ Violates OCP — every new format requires editing this class
public class ReportWorker
{
    public async Task<byte[]> GenerateAsync(ReportData data, string format)
    {
        if (format == "pdf")   { /* PDF logic */ }
        else if (format == "excel") { /* Excel logic */ }
        else if (format == "csv")   { /* CSV — must edit class again */ }
        // Grows forever — every addition risks breaking existing formats
    }
}
```

```csharp
// ✅ OCP — add a new format by adding a new class, touching nothing existing
public interface IReportGenerator
{
    string Format { get; }
    Task<byte[]> GenerateAsync(ReportData data);
}

public class PdfReportGenerator   : IReportGenerator { public string Format => "pdf";   ... }
public class ExcelReportGenerator : IReportGenerator { public string Format => "excel"; ... }
public class CsvReportGenerator   : IReportGenerator { public string Format => "csv";   ... } // new ✅

// Orchestrator never changes regardless of how many formats are added
public class ReportOrchestrator
{
    private readonly IEnumerable<IReportGenerator> _generators;

    public async Task<byte[]> GenerateAsync(ReportData data, string format)
        => await _generators.First(g => g.Format == format).GenerateAsync(data);
}

// Only change needed: one new line in Program.cs
builder.Services.AddScoped<IReportGenerator, CsvReportGenerator>();
```

OCP also applies at the architecture level: when we needed the Engagement Service to react to `OwnershipChanged` events, we added a new Service Bus subscription. The Ownership Service that publishes the event was not modified at all.

> **Interview line**: "OCP is why our Service Bus Topic pattern scales well. Adding a new subscriber means creating a new subscription — the publisher never changes. Same principle in the Report Worker — CSV support was a new class, not an edit to existing code."

---

### Q6. [Topic: SOLID] Explain the Liskov Substitution Principle with a real example.

**Definition**: Objects of a child class must be substitutable for objects of the parent class without breaking the application. Children must honour the parent's full contract.

```csharp
// ❌ Violates LSP — child breaks the parent's contract
public class RestrictedReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data)
    {
        if (data.CompanyId != "AAPL")
            throw new NotSupportedException("Only AAPL supported"); // surprise!
        return pdfBytes;
    }
}
// ReportOrchestrator trusts any IReportGenerator works for any company.
// This child breaks that trust — swapping it in breaks the system.

// LSP violation test: if a child throws NotImplementedException or adds
// hidden restrictions the parent contract doesn't declare → LSP violation.
```

```csharp
// ✅ LSP — every implementation honours the full contract
public class PdfReportGenerator : IReportGenerator
{
    public string Format => "pdf";
    public async Task<byte[]> GenerateAsync(ReportData data)
    {
        // Works for ANY valid ReportData — no hidden restrictions ✅
    }
}

// INotificationSender LSP example:
INotificationSender s1 = new EmailNotificationSender();
INotificationSender s2 = new InAppNotificationSender();

await s1.SendAsync("user-1", "Ownership alert"); // ✅
await s2.SendAsync("user-1", "Ownership alert"); // ✅ — fully interchangeable
```

> **Interview line**: "LSP is what makes our DI container trustworthy. When the orchestrator gets an IReportGenerator, it expects it to handle any valid report request. If a child class throws for certain inputs the interface contract doesn't warn about, you've introduced a hidden landmine."

---

### Q7. [Topic: SOLID] Explain the Interface Segregation Principle with a real example.

**Definition**: Don't force a class to implement methods it doesn't need. Split fat interfaces into small, focused ones.

```csharp
// ❌ Violates ISP — one fat interface forces all consumers to implement everything
public interface IReportService
{
    Task<byte[]> GenerateAsync(ReportData data);      // Report Worker needs this
    Task<JobStatus> GetStatusAsync(Guid jobId);        // Angular UI needs this
    Task<string> GetDownloadUrlAsync(Guid jobId);      // Angular UI needs this
    Task SendByEmailAsync(Guid jobId, string email);   // Email job needs this
    Task ArchiveAsync(Guid jobId);                     // Cleanup job needs this
}

// Report Worker only generates — forced to stub 4 methods it never uses:
public class ReportWorker : IReportService
{
    public Task<byte[]> GenerateAsync(ReportData data) { /* real work */ }
    public Task<JobStatus> GetStatusAsync(Guid jobId) => throw new NotImplementedException();
    public Task<string> GetDownloadUrlAsync(Guid jobId) => throw new NotImplementedException();
    public Task SendByEmailAsync(Guid jobId, string email) => throw new NotImplementedException();
    public Task ArchiveAsync(Guid jobId) => throw new NotImplementedException();
}
```

```csharp
// ✅ ISP — split into focused interfaces, each consumer depends on only what it needs
public interface IReportGenerator    { Task<byte[]> GenerateAsync(ReportData data); }
public interface IReportStatusProvider { Task<JobStatus> GetStatusAsync(Guid jobId); Task<string> GetDownloadUrlAsync(Guid jobId); }
public interface IReportEmailSender  { Task SendByEmailAsync(Guid jobId, string email); }

public class ReportWorker : IReportGenerator          // only what it needs ✅
{
    public Task<byte[]> GenerateAsync(ReportData data) { /* real work */ }
}

public class ReportController : IReportStatusProvider // only what it needs ✅
{
    public Task<JobStatus> GetStatusAsync(Guid jobId) { ... }
    public Task<string> GetDownloadUrlAsync(Guid jobId) { ... }
}
```

> **Interview line**: "We hit an ISP violation early when a single IReportService interface bundled generation, status checking, download, and archiving. The Report Worker only generates — it was forced to stub four methods. We split it into three focused interfaces. Each class now depends on exactly the surface it needs."

---

### Q8. [Topic: SOLID] [EPAM] Explain the Dependency Inversion Principle with a real example.

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions (interfaces). Dependencies should be injected, not created.

```csharp
// ❌ Violates DIP — high-level class hardwired to concrete low-level classes
public class EngagementService
{
    private readonly SqlEngagementRepository _repo     = new SqlEngagementRepository();
    private readonly SmtpNotificationSender  _notifier = new SmtpNotificationSender();
    private readonly ServiceBusEventPublisher _pub     = new ServiceBusEventPublisher();
    // Changing email provider or DB → must edit EngagementService
}
```

```csharp
// ✅ DIP — depend on abstractions; concrete classes injected from outside
public class EngagementService
{
    private readonly IEngagementRepository _repo;
    private readonly INotificationSender   _notifier;
    private readonly IEventPublisher       _publisher;

    public EngagementService(
        IEngagementRepository repo,
        INotificationSender notifier,
        IEventPublisher publisher)
    {
        _repo = repo; _notifier = notifier; _publisher = publisher;
    }

    public async Task CompleteActivityAsync(Guid id, string notes)
    {
        var activity = await _repo.GetByIdAsync(id);
        activity.Complete(notes);
        await _repo.SaveAsync();
        await _notifier.SendAsync(...);
        await _publisher.PublishAsync(...);
    }
}

// Wiring in ONE place — Program.cs
builder.Services.AddScoped<IEngagementRepository, SqlEngagementRepository>();
builder.Services.AddScoped<INotificationSender,   EmailNotificationSender>();
builder.Services.AddScoped<IEventPublisher,        ServiceBusEventPublisher>();

// Switch to SendGrid? One line change in Program.cs. EngagementService never changes.
```

> **Interview line**: "DIP is exactly what .NET's built-in DI container implements. EngagementService depends on IEngagementRepository and INotificationSender — not on SqlEngagementRepository or SmtpSender. The wiring lives in Program.cs. When we changed notification providers, we wrote a new class and updated one line in Program.cs. The service didn't need to know."

---

### Q9. [Topic: SOLID] [EPAM] How does the Dependency Inversion Principle make unit testing better?

**Core problem without DIP**: if a class creates its own dependencies, you cannot isolate it in a test.

```csharp
// Without DIP — test requires real SQL Server, real email, real Service Bus
public class EngagementService
{
    private readonly SqlEngagementRepository _repo = new SqlEngagementRepository();
    // constructor creates real dependencies → test cannot substitute them
}

[Test]
public async Task CompleteActivity_ShouldSetStatus()
{
    var service = new EngagementService();
    // ❌ This test hits a real database, sends a real email, publishes a real event
    // Slow, flaky, needs infrastructure, has side effects
}
```

**With DIP — inject fakes in tests:**

```csharp
// Option 1: Hand-written fakes
public class FakeEngagementRepository : IEngagementRepository
{
    private readonly List<EngagementActivity> _store = new();
    public void Seed(EngagementActivity a) => _store.Add(a);
    public Task<EngagementActivity?> GetByIdAsync(Guid id) => Task.FromResult(_store.FirstOrDefault(a => a.Id == id));
    public Task SaveAsync() => Task.CompletedTask; // does nothing ✅
}

public class FakeNotificationSender : INotificationSender
{
    public List<string> SentMessages { get; } = new();
    public Task SendAsync(string userId, string msg) { SentMessages.Add(msg); return Task.CompletedTask; }
}

[Test]
public async Task CompleteActivity_ShouldSetStatusToCompleted()
{
    var repo      = new FakeEngagementRepository();
    var notifier  = new FakeNotificationSender();
    var publisher = new FakeEventPublisher();

    var activity = new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.Roadshow);
    repo.Seed(activity);

    var service = new EngagementService(repo, notifier, publisher);
    await service.CompleteActivityAsync(activity.Id, "Great meeting with BlackRock");

    Assert.AreEqual(EngagementStatus.Completed, activity.Status); // ✅
    Assert.Single(notifier.SentMessages);                         // ✅
    // No SQL, no email, no Service Bus — runs in milliseconds ✅
}
```

```csharp
// Option 2: Moq — generates fakes automatically
[Test]
public async Task CompleteActivity_ShouldPublishEvent()
{
    var mockRepo      = new Mock<IEngagementRepository>();
    var mockNotifier  = new Mock<INotificationSender>();
    var mockPublisher = new Mock<IEventPublisher>();

    var activity = new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.NDR);
    mockRepo.Setup(r => r.GetByIdAsync(activity.Id)).ReturnsAsync(activity);

    var service = new EngagementService(mockRepo.Object, mockNotifier.Object, mockPublisher.Object);
    await service.CompleteActivityAsync(activity.Id, "Strong interest from Vanguard");

    mockPublisher.Verify(p => p.PublishAsync(It.IsAny<EngagementCompletedEvent>()), Times.Once);
    mockRepo.Verify(r => r.SaveAsync(), Times.Once);
}
```

```csharp
// Option 3: EF Core InMemory provider — for testing repositories directly
[Test]
public async Task Repository_ShouldReturnActivity_ForCurrentTenant()
{
    var options = new DbContextOptionsBuilder<EngagementDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()) // fresh DB per test
        .Options;

    using var context = new EngagementDbContext(options, new FakeTenantService("tenant-abc"));
    context.EngagementActivities.Add(new EngagementActivity(Guid.NewGuid(), "tenant-abc", ActivityType.Roadshow));
    await context.SaveChangesAsync();

    var repo = new EngagementRepository(context);
    var result = await repo.GetByIdAsync(activity.Id);

    Assert.NotNull(result);
    Assert.AreEqual("tenant-abc", result.TenantId); // global filter enforced ✅
}
```

```
WITHOUT DIP:                          WITH DIP:
  Class creates SqlRepository    →     Inject FakeRepo / Mock
  Class creates SmtpSender       →     Inject FakeNotifier / Mock
  Class creates ServiceBusClient →     Inject FakePublisher / Mock
  Test needs real infrastructure       Test runs in milliseconds
  Slow, flaky, has side effects        Fast, isolated, no side effects
```

> **Interview line**: "DIP is the design principle that makes unit testing practical. EngagementService depends on interfaces, not on concrete SQL or SMTP classes. In production the DI container wires in real implementations. In tests we inject fakes or Moq mocks. The test never touches a database or network. It runs in milliseconds and proves business logic is correct in complete isolation."

---

### SOLID — Quick Reference Table

| Principle | One Line | Capital Access Hook |
|---|---|---|
| **S**ingle Responsibility | One class, one reason to change | Service / Repository / Publisher / Notification each own their own job |
| **O**pen/Closed | Extend by adding, not editing | New report format = new class, not editing ReportOrchestrator |
| **L**iskov Substitution | Children must honour parent's contract | Any IReportGenerator works for any valid report request |
| **I**nterface Segregation | Small focused interfaces, not fat ones | IReportGenerator / IReportStatusProvider / IReportEmailSender |
| **D**ependency Inversion | Depend on interfaces, wire in Program.cs | EngagementService → IEngagementRepository, swappable in tests |

---

## 2. C# Language Features

<!-- Content added in next session -->

## 4. .NET Core & ASP.NET Core

<!-- Content added in next session -->

## 5. Entity Framework Core

<!-- Content added in next session -->

## 6. LINQ

<!-- Content added in next session -->
