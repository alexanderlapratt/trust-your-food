import { useState, useRef, useEffect } from 'react';
import './ChatDrawer.css';

// The backend fallback sometimes puts the entire raw LLM JSON string into
// `data.message` when it can't parse the response (e.g. wrapped in markdown).
// Detect that case and unwrap so the recipe/suggestions fields render properly.
function normalizeAgentResponse(data) {
  if (typeof data?.message === 'string') {
    const trimmed = data.message.trim();
    if (trimmed.startsWith('{')) {
      try {
        const inner = JSON.parse(trimmed);
        if (inner && typeof inner.message === 'string') return inner;
      } catch { /* not JSON — keep original */ }
    }
  }
  return data;
}

export default function ChatDrawer({ open, onClose, products, onAddToCart }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your farm-to-table shopping assistant. Tell me what you'd like to cook, or describe what you're looking for — like \"pasture-raised protein under $60\" or \"ingredients for a spring salad\" — and I'll match you with local farms. 🌿",
      data: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedAll, setAddedAll] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text, data: null }]);
    setLoading(true);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
      const data = normalizeAgentResponse(await res.json());
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.message || '',
        data,
      }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: `Sorry, something went wrong: ${e.message}`,
        data: null,
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAll(suggestedItems, msgIndex) {
    const toAdd = suggestedItems
      .map((item) => products.find(
        (p) => String(p._id) === String(item.productId)
      ))
      .filter(Boolean);

    for (const product of toAdd) {
      await onAddToCart(product);
    }
    setAddedAll(msgIndex);
    setTimeout(() => setAddedAll(null), 2500);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`chat-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`chat-drawer ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <span className="chat-header-icon">🌿</span>
            <div>
              <div className="chat-header-name">Farm-to-Table AI Assistant</div>
              <div className="chat-header-sub">Powered by local farms near New Haven</div>
            </div>
          </div>
          <button className="chat-close" onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-avatar">🌿</div>
              )}
              <div className="chat-bubble-wrap">
                <div className="chat-bubble">{msg.text}</div>

                {/* Recipe card */}
                {msg.data?.recipe && (
                  <div className="chat-recipe">
                    <div className="chat-recipe-title">📋 Recipe</div>
                    <div className="chat-recipe-body">{msg.data.recipe}</div>
                  </div>
                )}

                {/* Suggested items */}
                {msg.data?.suggested_items?.length > 0 && (
                  <div className="chat-suggestions">
                    <div className="chat-suggestions-title">🛒 Suggested from local farms</div>
                    {msg.data.suggested_items.map((item, j) => {
                      const found = products.find((p) => String(p._id) === String(item.productId));
                      const imgSrc = found?.imageUrl || null;
                      const fallbackEmoji = {
                        vegetables: '🥦', fruits: '🍎', meat: '🥩', dairy: '🧀',
                        eggs: '🥚', herbs: '🌿', honey: '🍯', grains: '🌾', other: '🛒',
                      }[found?.category] || '🌿';
                      return (
                        <div key={j} className="chat-suggestion-item">
                          <div className="chat-suggestion-thumb">
                            {imgSrc
                              ? <img src={imgSrc} alt={item.productName} className="chat-suggestion-img" />
                              : <span className="chat-suggestion-emoji">{fallbackEmoji}</span>
                            }
                          </div>
                          <div className="chat-suggestion-content">
                            <div className="chat-suggestion-main">
                              <div className="chat-suggestion-name">{item.productName}</div>
                              <div className="chat-suggestion-farm">{item.farmName}</div>
                            </div>
                            <div className="chat-suggestion-meta">
                              <div className="chat-suggestion-meta-left">
                                {found && (
                                  <span className="chat-suggestion-price">
                                    ${found.price.toFixed(2)}/{found.unit}
                                  </span>
                                )}
                                {item.quantity && (
                                  <span className="chat-suggestion-qty">{item.quantity}</span>
                                )}
                              </div>
                              <div className="chat-suggestion-reason">{item.reason}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className={`chat-add-all ${addedAll === i ? 'added' : ''}`}
                      onClick={() => handleAddAll(msg.data.suggested_items, i)}
                      disabled={addedAll === i}
                    >
                      {addedAll === i ? '✓ Added to Basket!' : '🧺 Add All to Basket'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg chat-msg-assistant">
              <div className="chat-avatar">🌿</div>
              <div className="chat-bubble-wrap">
                <div className="chat-bubble chat-bubble-loading">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Ask for a recipe or describe what you need…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            className="chat-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
