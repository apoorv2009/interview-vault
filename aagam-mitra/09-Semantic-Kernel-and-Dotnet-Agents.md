# Semantic Kernel & .NET Agentic Systems
## C# Alternative to LangChain/LangGraph for Building AI Agents

> **Context:** While Aagam Mitra uses Python (FastAPI + Groq), this document covers how to build similar agentic systems in C#/.NET using Semantic Kernel — critical knowledge for .NET-focused interviews (Microsoft, JPMC internal platforms, enterprise backends).

---

## Table of Contents

1. [What is Semantic Kernel?](#what-is-semantic-kernel)
2. [Semantic Kernel vs LangChain vs LangGraph](#semantic-kernel-vs-langchain-vs-langgraph)
3. [Core Concepts: Plugins, Functions, Planners](#core-concepts)
4. [Building an Agent Loop in C#](#agent-loop)
5. [Prompt Management & Templates](#prompts)
6. [Memory Management in Semantic Kernel](#memory)
7. [Tool Integration & Plugin Architecture](#plugins)
8. [Production Patterns](#production)

---

## What is Semantic Kernel?

---

### **.NET's LangChain Equivalent: Enterprise-Grade AI SDK**

```
Python: LangChain → Flexible, broad ecosystem, community-driven
.NET: Semantic Kernel → Enterprise, Azure-native, Microsoft-backed
  Both solve: Standardize LLM interactions, orchestrate tools, manage memory
  SK advantage: Tighter Azure integration, compliance-ready, production patterns
```

**Semantic Kernel** is an open-source SDK by Microsoft for building AI applications in .NET. It's the .NET equivalent of LangChain but with tighter integration with Azure services and a focus on enterprise reliability.

**Official:** https://github.com/microsoft/semantic-kernel
**NuGet:** `dotnet add package Microsoft.SemanticKernel`

**Core purpose:** Standardize how .NET apps interact with LLMs, similar to how LangChain does for Python.

```csharp
// Semantic Kernel in 30 seconds
var builder = Kernel.CreateBuilder();
builder.AddAzureOpenAIChatCompletion("gpt-4", deploymentName, endpoint, apiKey);
var kernel = builder.Build();

// Run a simple prompt
var prompt = "What is Jain philosophy?";
var result = await kernel.InvokePromptAsync(prompt);
Console.WriteLine(result);
```

---

## Semantic Kernel vs LangChain vs LangGraph

---

### **Tool Comparison: SK vs LC vs LG**

```
Question: Which .NET framework?
Answer: Semantic Kernel (Microsoft's official .NET AI SDK)

Comparison table below shows feature parity and differences.
SK is production-grade, enterprise-focused, Azure-native.
```

| Feature | Semantic Kernel | LangChain | LangGraph |
|---------|-----------------|-----------|-----------|
| **Language** | C# / .NET | Python | Python |
| **Provider Support** | OpenAI, Azure, Hugging Face, Ollama, Groq | 100+ LLM providers | OpenAI, Anthropic, Hugging Face |
| **Agent Orchestration** | Planners (Handlebars, Sequential) | Agent Executors | State graphs, conditional routing |
| **Tool/Plugin System** | Native plugins architecture | Tools + function calling | Tool bindings |
| **Prompt Management** | Templates (inline + files) | Prompt templates | Prompt engineering (manual) |
| **Memory Management** | Volatile + persistent collections | Chat history + vector stores | State machine (custom) |
| **Streaming** | ✅ Native | ✅ Native | ✅ Via SDK |
| **Caching** | ⚠️ Via Azure | ✅ Built-in | ❌ Not native |
| **Enterprise Focus** | ✅ Azure-first, compliance-ready | ⚠️ Community-driven | ⚠️ Research-focused |
| **Production Readiness** | ✅ Production-grade (v1.0+) | ✅ Production-grade | ⚠️ Rapidly evolving |
| **Community** | Growing (Microsoft-backed) | Largest | Growing (Anthropic-backed) |

**In short:**
- **LangChain:** Flexible, broad ecosystem, Python-first
- **LangGraph:** Advanced reasoning loops, state machines, Python-only
- **Semantic Kernel:** Enterprise .NET, tight Azure integration, reliability-focused

---

## Core Concepts: Plugins, Functions, Planners

---

### **Three Building Blocks: Plugins, Functions, Planners**

```
Plugin = Collection of capabilities (like LangChain tools)
Function = Individual capability marked with [KernelFunction]
Planner = Orchestrator that routes to appropriate plugin/function

Example: TempleOpsPlugin has functions: GetSlots, BookSlot
         JainPhilosophyPlugin has function: SearchJainTexts
```

### Plugins (≈ LangChain Tools)

A **plugin** is a collection of functions the agent can call. Similar to tools in LangChain.

```csharp
// Define a plugin (collection of capabilities)
public class JainPhilosophyPlugin
{
    private readonly IVectorSearch _vectorDb;
    
    public JainPhilosophyPlugin(IVectorSearch vectorDb)
    {
        _vectorDb = vectorDb;
    }
    
    // KernelFunction = function the kernel can invoke
    [KernelFunction("search_jain_texts")]
    [Description("Search Jain scriptures for a given topic")]
    public async Task<string> SearchJainTexts(
        [Description("The topic to search for")] string query,
        [Description("Number of results to return")] int top_k = 8
    )
    {
        var embeddings = await _embedder.EmbedAsync(query);
        var results = await _vectorDb.SearchAsync(embeddings, top_k);
        return string.Join("\n", results.Select(r => r.Text));
    }
}

// Define another plugin for temple operations
public class TempleOpsPlugin
{
    [KernelFunction("get_shantidhara_slots")]
    [Description("Get available Shantidhara slots for a specific date")]
    public async Task<string> GetShantidharaSlots(
        [Description("Date in YYYY-MM-DD format")] string date,
        [Description("Temple ID")] string temple_id
    )
    {
        var slots = await _templeService.GetAvailableSlotsAsync(temple_id, date);
        return JsonConvert.SerializeObject(slots);
    }
    
    [KernelFunction("book_shantidhara")]
    [Description("Book a Shantidhara slot")]
    public async Task<string> BookShantidhara(
        [Description("Slot ID")] string slot_id,
        [Description("Temple ID")] string temple_id,
        [Description("User ID")] string user_id
    )
    {
        var booking = await _templeService.BookSlotAsync(slot_id, temple_id, user_id);
        return JsonConvert.SerializeObject(booking);
    }
}

// Register plugins with the kernel
var kernel = builder.Build();
kernel.Plugins.AddFromType<JainPhilosophyPlugin>();
kernel.Plugins.AddFromType<TempleOpsPlugin>();
```

### Planners (≈ LangGraph Agent Loops)

A **planner** orchestrates plugins to solve a user goal. Think of it as the agent's "reasoning loop."

```csharp
// Semantic Kernel provides two types of planners:

// 1. HANDLEBARS PLANNER (Recommended for production)
// - Uses a template-based approach
// - Predictable, explainable reasoning
// - Works like a state machine

var planner = new HandlebarsPlanner();
var ask = "Book Shantidhara for January 15 and explain its significance";
var result = await planner.ExecuteAsync(kernel, ask);
// Planner automatically:
// 1. Detects intent (booking + knowledge)
// 2. Routes to TempleOpsPlugin.GetShantidharaSlots
// 3. Routes to JainPhilosophyPlugin.SearchJainTexts
// 4. Synthesizes response

// 2. FUNCTION CALLING PLANNER (More like LangGraph)
// - Uses LLM to decide which functions to call
// - More flexible but less predictable
// - Requires more tokens

var functionCallingPlanner = new FunctionCallingStepwisePlanner();
var plan = await functionCallingPlanner.ExecuteAsync(kernel, ask);
```

### Kernel Configuration

```csharp
// Build a kernel with multiple LLM providers
var builder = Kernel.CreateBuilder();

// Add OpenAI (if using OpenAI)
builder.AddOpenAIChatCompletion(
    modelId: "gpt-4",
    apiKey: "sk-..."
);

// OR add Azure OpenAI (enterprise alternative)
builder.AddAzureOpenAIChatCompletion(
    deploymentName: "gpt-4",
    endpoint: new Uri("https://your-instance.openai.azure.com/"),
    apiKey: "your-key"
);

// OR add Groq (like Aagam Mitra)
builder.AddOpenAIChatCompletion(
    modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
    apiKey: "your-groq-key",
    httpClient: new HttpClient() { BaseAddress = new Uri("https://api.groq.com/openai/v1/") }
);

var kernel = builder.Build();
```

---

## Building an Agent Loop in C#

---

### **Aagam Mitra Loop Ported to C# (.NET)**

```
Same 4-step loop as Python:
1. Build message history (system prompt + last 8 turns)
2. Detect intent (regex keywords)
3. Route to appropriate plugin(s)
4. Synthesize via LLM

Implementation: C# async/await, Semantic Kernel plugins instead of custom tools
```

Here's how to build the Aagam Mitra agent loop equivalent in Semantic Kernel:

```csharp
public class AagamMitraAgent
{
    private readonly Kernel _kernel;
    private readonly ILogger<AagamMitraAgent> _logger;
    private const int MaxIterations = 5;
    
    public AagamMitraAgent(Kernel kernel, ILogger<AagamMitraAgent> logger)
    {
        _kernel = kernel;
        _logger = logger;
    }
    
    public async Task<string> RunAsync(string userMessage, List<ChatHistory> history)
    {
        // Step 1: Build message history
        var chatHistory = new ChatHistory();
        
        // System prompt
        chatHistory.AddSystemMessage(
            "You are Aagam Mitra, an AI assistant for a Jain temple community. " +
            "Answer questions about Jain philosophy, temple operations, and community events. " +
            "Be respectful and cite sources when answering."
        );
        
        // Previous turns (last 8)
        foreach (var msg in history.TakeLast(8))
        {
            if (msg.Role == "user")
                chatHistory.AddUserMessage(msg.Content);
            else if (msg.Role == "assistant")
                chatHistory.AddAssistantMessage(msg.Content);
        }
        
        // Current query
        chatHistory.AddUserMessage(userMessage);
        
        // Step 2: Intent detection (similar to Aagam Mitra's orchestrator)
        var intents = await DetectIntentAsync(userMessage);
        _logger.LogInformation("Detected intents: {intents}", string.Join(", ", intents));
        
        // Step 3: Route to appropriate plugin(s)
        if (intents.Contains("scripture"))
        {
            var scriptureResult = await _kernel.InvokeAsync(
                "JainPhilosophyPlugin",
                "search_jain_texts",
                new KernelArguments { { "query", userMessage } }
            );
            chatHistory.AddAssistantMessage(scriptureResult.ToString());
        }
        
        if (intents.Contains("temple_ops"))
        {
            var opsResult = await _kernel.InvokeAsync(
                "TempleOpsPlugin",
                "get_shantidhara_slots",
                new KernelArguments { { "date", ExtractDate(userMessage) } }
            );
            chatHistory.AddAssistantMessage(opsResult.ToString());
        }
        
        // Step 4: Synthesize via LLM
        var synthesisPrompt = $"""
            Based on the following information, provide a helpful response to the user's query:
            Query: {userMessage}
            Information gathered: {string.Join("\n", chatHistory.Select(m => m.Content))}
            
            Provide a warm, helpful response that directly answers the user's question.
            """;
        
        var response = await _kernel.InvokePromptAsync(synthesisPrompt);
        
        return response.ToString();
    }
    
    private async Task<List<string>> DetectIntentAsync(string message)
    {
        // Simple keyword-based (like Aagam Mitra)
        var intents = new List<string>();
        
        if (Regex.IsMatch(message, @"\b(sutra|karma|dharma|moksha|jain)\b", RegexOptions.IgnoreCase))
            intents.Add("scripture");
        
        if (Regex.IsMatch(message, @"\b(book|slot|shantidhara|membership|donation)\b", RegexOptions.IgnoreCase))
            intents.Add("temple_ops");
        
        return intents;
    }
    
    private string ExtractDate(string message)
    {
        // Simple date extraction (production would use NLP)
        var match = Regex.Match(message, @"(\d{4}-\d{2}-\d{2})");
        return match.Success ? match.Groups[1].Value : DateTime.Today.AddDays(1).ToString("yyyy-MM-dd");
    }
}

// Usage:
var builder = Kernel.CreateBuilder();
builder.AddAzureOpenAIChatCompletion("gpt-4", endpoint, apiKey);
var kernel = builder.Build();

kernel.Plugins.AddFromType<JainPhilosophyPlugin>();
kernel.Plugins.AddFromType<TempleOpsPlugin>();

var agent = new AagamMitraAgent(kernel, logger);
var response = await agent.RunAsync(
    userMessage: "Book Shantidhara and explain its significance",
    history: chatHistory
);
```

---

## Prompt Management & Templates

---

### **Template-Based Prompts: 3 Approaches**

```
1. Inline: String interpolation with {{$variable}}
2. Structured: Multi-line templates with variables
3. External: YAML files with prompt + settings

Semantic Kernel: {{$input}} syntax
LangChain: {variable} syntax (similar concept)
```

Semantic Kernel supports prompt templates similar to LangChain:

```csharp
// Option 1: Inline prompts
var result = await kernel.InvokePromptAsync(
    "What is {{$input}}? Explain in Jain context."
);

// Option 2: Structured prompts with variables
var prompt = """
    You are a Jain philosophy expert.
    Answer this question: {{$question}}
    Context: {{$context}}
    Format: Keep answer under {{$max_words}} words.
    """;

var result = await kernel.InvokePromptAsync(
    prompt,
    new KernelArguments
    {
        { "question", "What is Karma?" },
        { "context", "Jain perspective" },
        { "max_words", 100 }
    }
);

// Option 3: External prompt files (YAML)
// File: Prompts/JainExplainer.yaml
// prompt: |
//   Explain {{$concept}} in Jain context.
//   Keep it under {{$max_words}} words.
// settings:
//   temperature: 0.5
//   top_p: 0.9

var promptSettings = PromptTemplateFactory.Create(File.ReadAllText("Prompts/JainExplainer.yaml"));
var result = await kernel.InvokeAsync(promptSettings, arguments);
```

---

## Memory Management in Semantic Kernel

---

### **Two Memory Types: Semantic (RAG) + Conversational (Chat History)**

```
Semantic Memory: Store embeddings, search by similarity (RAG)
  - VolatileMemoryStore (in-memory, fast, lost on restart)
  - SqlServerMemoryStore (persistent, survives restarts)

Conversational Memory: Store chat messages (session history)
  - ChatHistory object (in-memory for current request)
  - Custom DB store (persist across sessions)
```

Semantic Kernel provides built-in memory management (similar to LangChain's memory):

```csharp
// Step 1: Create a memory store (volatile or persistent)
IMemoryStore memoryStore;

// Option A: In-memory (volatile)
memoryStore = new VolatileMemoryStore();

// Option B: Persistent (SQL Server, PostgreSQL, etc.)
var connectionString = "Server=.;Database=AagamMitra;";
memoryStore = new SqlServerMemoryStore(connectionString);

// Step 2: Create text embeddings client
var embeddingGenerator = new AzureOpenAITextEmbeddingGenerationService(
    modelId: "text-embedding-3-small",
    endpoint: new Uri(endpoint),
    apiKey: apiKey
);

// Step 3: Create semantic memory
var semanticMemory = new SemanticTextMemory(memoryStore, embeddingGenerator);

// Step 4: Store knowledge (RAG)
await semanticMemory.SaveInformationAsync(
    collection: "jain-texts",
    id: "sutra_001",
    text: "Karma is the law of cause and effect in Jainism..."
);

// Step 5: Retrieve knowledge
var memories = await semanticMemory.SearchAsync(
    collection: "jain-texts",
    query: "What is Karma?",
    limit: 8,
    minRelevanceScore: 0.7
);

foreach (var memory in memories)
{
    Console.WriteLine($"Relevance: {memory.Relevance:P} — {memory.Text}");
}
```

### Chat History Management

---

### **Persistent Chat: Database-Backed History**

```
Store pattern: SaveMessageAsync(userId, templeId, role, content)
Retrieve pattern: GetHistoryAsync(userId, templeId, limit=8)
Same as Aagam Mitra: Only keep last 8 turns to save tokens
```

```csharp
// Store conversation history
public class ChatHistoryStore
{
    private readonly IDbConnection _db;
    
    public async Task SaveMessageAsync(string userId, string templeId, string role, string content)
    {
        await _db.ExecuteAsync(
            "INSERT INTO ChatHistory (UserId, TempleId, Role, Content, Timestamp) VALUES (@uid, @tid, @role, @content, @ts)",
            new { uid = userId, tid = templeId, role, content, ts = DateTime.UtcNow }
        );
    }
    
    public async Task<List<ChatMessage>> GetHistoryAsync(string userId, string templeId, int limit = 8)
    {
        return (await _db.QueryAsync<ChatMessage>(
            "SELECT Role, Content FROM ChatHistory WHERE UserId = @uid AND TempleId = @tid ORDER BY Timestamp DESC LIMIT @limit",
            new { uid = userId, tid = templeId, limit }
        )).ToList();
    }
}

// Usage in agent
var history = await chatStore.GetHistoryAsync(userId, templeId, limit: 8);
var chatHistory = new ChatHistory();
foreach (var msg in history)
{
    chatHistory.AddMessage(msg.Role, msg.Content);
}
```

---

## Tool Integration & Plugin Architecture

---

### **Two Tool Approaches: Auto-Binding + Step-wise Calling**

```
Auto-binding: Kernel discovers plugins, LLM sees tool metadata
Step-wise: LLM calls tool → observe result → loop

Semantic Kernel supports both patterns.
```

### Automatic Tool Binding (Function Calling)

Semantic Kernel can automatically convert plugins to tool definitions for the LLM:

```csharp
// Plugins are automatically discoverable by the kernel
kernel.Plugins.AddFromType<JainPhilosophyPlugin>();
kernel.Plugins.AddFromType<TempleOpsPlugin>();

// When you invoke the kernel, it sees available tools:
var tools = kernel.Plugins.GetFunctionsMetadata();
foreach (var tool in tools)
{
    Console.WriteLine($"Tool: {tool.PluginName}.{tool.Name}");
    Console.WriteLine($"  Description: {tool.Description}");
    foreach (var param in tool.Parameters)
    {
        Console.WriteLine($"    - {param.Name}: {param.Description}");
    }
}

// The LLM gets this metadata and can decide which tools to call
// Similar to how Groq's tool_calls work in Aagam Mitra
```

### Step-wise Function Calling (Like Agent Loop)

---

### **Loop Pattern: Call → Execute → Observe → Loop**

```
Similar to Aagam Mitra's custom agent loop:
1. Call LLM with available tools
2. Check if LLM wants to call tool
3. Execute tool, append result to history
4. Loop back, LLM sees result and can refine
5. When LLM returns no more tool calls, done
```

```csharp
// Semantic Kernel's function calling planner (similar to LangGraph)
public class StepwiseAgentExecutor
{
    private readonly Kernel _kernel;
    private const int MaxSteps = 5;
    
    public async Task<string> ExecuteAsync(string goal, ChatHistory history)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage("You are a helpful Jain temple assistant.");
        chatHistory.AddUserMessage(goal);
        
        var chatCompletion = _kernel.GetRequiredService<IChatCompletionService>();
        var toolChoice = ToolChoice.Auto; // LLM decides when to use tools
        
        for (int step = 0; step < MaxSteps; step++)
        {
            // Call LLM with available tools
            var response = await chatCompletion.GetChatMessageContentAsync(
                chatHistory,
                new PromptExecutionSettings { ToolChoiceUpdate = toolChoice }
            );
            
            // Check if LLM wants to call a tool
            if (response.Content.Any(item => item is ToolCallContent))
            {
                var toolCalls = response.Content.OfType<ToolCallContent>();
                
                foreach (var toolCall in toolCalls)
                {
                    // Execute tool
                    var result = await _kernel.InvokeAsync(
                        toolCall.PluginName,
                        toolCall.FunctionName,
                        new KernelArguments(toolCall.Arguments)
                    );
                    
                    // Add tool result to history
                    chatHistory.AddAssistantMessage(response);
                    chatHistory.AddToolMessage(result.ToString(), toolCall.Id);
                }
            }
            else
            {
                // LLM finished reasoning, return final answer
                return response.Content.FirstOrDefault()?.Text ?? "No response";
            }
        }
        
        throw new Exception($"Agent did not finish within {MaxSteps} steps");
    }
}
```

---

## Production Patterns

---

### **Production Requirements: Error Handling, Logging, Caching**

```
Pattern 1: Polly retry policy (exponential backoff)
Pattern 2: ILogger integration (all operations logged)
Pattern 3: Prompt caching with Azure OpenAI (90% token discount)
```

### Error Handling & Retry Logic

```csharp
public class ResilientAgent
{
    private readonly Kernel _kernel;
    private readonly IAsyncPolicy<string> _retryPolicy;
    
    public ResilientAgent(Kernel kernel)
    {
        _kernel = kernel;
        
        // Polly retry policy (similar to Aagam Mitra's retry logic)
        _retryPolicy = Policy
            .Handle<HttpRequestException>()
            .Or<OperationCanceledException>()
            .OrResult<string>(r => string.IsNullOrEmpty(r))
            .WaitAndRetryAsync<string>(
                retryCount: 4,
                sleepDurationProvider: attempt => 
                    TimeSpan.FromSeconds(Math.Min(8.0, 1 + attempt)),
                onRetry: (outcome, timespan, attempt, context) =>
                {
                    Console.WriteLine($"Retry attempt {attempt} after {timespan.TotalSeconds}s");
                }
            );
    }
    
    public async Task<string> RunAsync(string input)
    {
        return await _retryPolicy.ExecuteAsync(async () =>
        {
            try
            {
                var result = await _kernel.InvokePromptAsync(input);
                return result.ToString();
            }
            catch (Exception ex)
            {
                // Log and re-throw for Polly to handle
                Console.WriteLine($"Error: {ex.Message}");
                throw;
            }
        });
    }
}
```

### Observability & Logging

---

### **Built-In Logging: ILogger Integration**

```
All kernel operations auto-logged:
- Function invocations
- Tool calls
- LLM requests/responses
- Errors

Similar to Aagam Mitra's audit log, but framework-native.
```

```csharp
// Semantic Kernel integrates with Microsoft.Extensions.Logging
builder.Services.AddLogging(config =>
{
    config.AddConsole();
    config.SetMinimumLevel(LogLevel.Information);
});

builder.Services.AddSingleton(sp =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();
    var kernelBuilder = Kernel.CreateBuilder();
    
    kernelBuilder.Services.AddSingleton(logger);
    kernelBuilder.AddAzureOpenAIChatCompletion("gpt-4", endpoint, apiKey);
    
    return kernelBuilder.Build();
});

// All kernel operations are automatically logged:
// - Function invocations
// - Tool calls
// - LLM requests/responses
// - Errors
```

### Prompt Caching (Cost Optimization)

---

### **Cache System Prompt: 90% Cost Reduction**

```
Pattern: Mark system prompt with CacheControlType = "ephemeral"
Result: Same system prompt cached for 5 minutes
Savings: 90% discount on cached tokens

Example: 500-token system prompt
  Without cache: 500 tokens × $0.0001 = $0.05
  With cache: 50 tokens × $0.0001 = $0.005
  Per request (100/day): $5 → $0.50/month savings
```

```csharp
// Azure OpenAI with prompt caching (reduces cost by 90%)
var executionSettings = new AzureOpenAIPromptExecutionSettings
{
    // Mark system prompt for caching
    // Repeated requests with same system prompt get 90% discount
    CacheControlType = "ephemeral",  // Cache for 5 minutes
    MaxTokens = 1000,
    Temperature = 0.5
};

var result = await kernel.InvokePromptAsync(
    prompt,
    new KernelArguments(executionSettings)
);
```

---

## Comparison: Aagam Mitra (Python) vs Semantic Kernel (.NET)

| Aspect | Aagam Mitra (Python) | Semantic Kernel (.NET) |
|--------|---------------------|----------------------|
| **Framework** | FastAPI + custom agent loop | Semantic Kernel + Plugins |
| **Intent Detection** | Regex patterns | Keyword regex or LLM-based |
| **Tool Definition** | JSON schema dict | `[KernelFunction]` attributes |
| **Agent Loop** | Custom asyncio loop | Handlebars/FunctionCalling planner |
| **Parallelization** | `asyncio.gather()` | `Task.WhenAll()` |
| **Caching** | Redis | Azure Cache / Memory store |
| **RAG** | Pinecone + Gemini embeddings | SemanticTextMemory (any store) |
| **Memory** | Custom chat history table | SemanticTextMemory built-in |
| **Logging** | Custom audit log | ILogger integration |
| **LLM Provider** | Groq API | Azure OpenAI / OpenAI / Groq |

---

## Key Takeaways for .NET Developers

1. **Semantic Kernel ≈ LangChain** — Same philosophy, C# implementation
2. **Plugins ≈ Tools** — Encapsulate capabilities the agent can use
3. **Planners ≈ Agent Executors** — Orchestrate plugins to solve goals
4. **Built-in Memory** — Better than LangChain's default (more structured)
5. **Azure Native** — Seamless integration with Azure OpenAI, Cognitive Search, SQL Server
6. **Production-Ready** — Strong error handling, logging, compliance features

**For JPMC interviews:** Demonstrate knowledge of Semantic Kernel if discussing .NET AI systems. Show you understand how to build multi-agent systems, handle tool calling, and implement enterprise patterns (error handling, observability, caching).

---

## Resources

- **Official Docs:** https://learn.microsoft.com/en-us/semantic-kernel/
- **GitHub:** https://github.com/microsoft/semantic-kernel
- **NuGet:** `dotnet add package Microsoft.SemanticKernel`
- **Examples:** https://github.com/microsoft/semantic-kernel/tree/main/samples
