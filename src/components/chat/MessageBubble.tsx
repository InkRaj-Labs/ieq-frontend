"use client";
import type { Message } from "@/hooks/useChat";

const MarkdownRenderer = ({ text }: { text: string }) => {
  const lines = text.split("\n");
  let inCode = false;
  const codeLines: string[] = [];
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
      } else {
        // End code block
        elements.push(
          <pre key={`code-${i}`} className="rounded-xl px-3 py-2 text-xs font-mono overflow-x-auto my-1"
            style={{ background: "rgba(0,0,0,0.4)", color: "var(--ieq-text)" }}>
            {codeLines.join("\n")}
          </pre>
        );
        codeLines.length = 0;
        inCode = false;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(<h3 key={i} className="font-bold text-base mt-2">{line.slice(2)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h4 key={i} className="font-semibold mt-1.5">{line.slice(3)}</h4>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span style={{ color: "var(--ieq-accent)" }}>·</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-2 pl-3 italic opacity-80"
          style={{ borderColor: "var(--ieq-accent)" }}>
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 ml-2">
            <span className="font-mono text-xs w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--ieq-accent)" }}>{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        );
      }
    } else if (line.trim()) {
      // Inline bold/code
      const formatted = line
        .replace(/`([^`]+)`/g, '<code class="rounded px-1 py-0.5 text-xs font-mono" style="background:rgba(0,0,0,0.35)">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    } else {
      elements.push(<div key={i} className="h-1.5" />);
    }
  });

  return <div className="space-y-1 text-sm leading-relaxed">{elements}</div>;
};

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-in`}>
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: isUser ? "var(--ieq-accent)" : "var(--ieq-card)",
          color: isUser ? "#fff" : "var(--ieq-text)",
          maxWidth: "85%",
          // Tail shape
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
        }}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <MarkdownRenderer text={message.content} />
        )}
      </div>
    </div>
  );
}
