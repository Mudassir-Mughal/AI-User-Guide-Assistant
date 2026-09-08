import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

type Message = {
  sender: "user" | "assistant";
  text: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text: "Hello! I can help you with the Employee Access Portal User Guide. Ask me a question about the portal."
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /*
    Automatically scroll to the newest message.
  */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  async function sendMessage() {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage: Message = {
      sender: "user",
      text: trimmedMessage
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3000/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: trimmedMessage
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to get a response from the assistant."
        );
      }

      const data = await response.json();

      const assistantMessage: Message = {
        sender: "assistant",
        text: data.answer
      };

      setMessages(prev => [
        ...prev,
        assistantMessage
      ]);

    } catch (error) {
      console.error(error);

      setMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text:
            "Sorry, I couldn't process your question right now. Please try again."
        }
      ]);

    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  return (
    <div className="app">
      <div className="chat-container">

        <header className="chat-header">
          <h1>
            Employee Access Portal Assistant
          </h1>

          <p>
            AI-powered User Guide Assistant
          </p>
        </header>

        <main className="messages">

          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-row ${message.sender}`}
            >
              <div
                className={`message-bubble ${message.sender}`}
              >
                {message.sender === "assistant" ? (
                  <ReactMarkdown>
                    {message.text}
                  </ReactMarkdown>
                ) : (
                  message.text
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-bubble assistant thinking">
                Searching the User Guide...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

        </main>

        <div className="input-area">

          <input
            type="text"
            value={input}
            placeholder="Ask a question about the Employee Access Portal..."
            onChange={event =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <button
            onClick={sendMessage}
            disabled={
              loading || !input.trim()
            }
          >
            {loading ? "Searching..." : "Send"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default App;