import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Italic, List, ListOrdered, Heading2, Minus, Eye, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  id?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Digite o texto...",
  className,
  minHeight = "min-h-48",
  disabled = false,
  id,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = 
      value.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      value.substring(end);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    const newText = 
      value.substring(0, lineStart) + 
      prefix + 
      value.substring(lineStart);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const toolbarButtons = [
    {
      icon: Bold,
      title: "Negrito (Ctrl+B)",
      action: () => insertMarkdown("**", "**"),
    },
    {
      icon: Italic,
      title: "Itálico (Ctrl+I)",
      action: () => insertMarkdown("_", "_"),
    },
    {
      icon: Heading2,
      title: "Título",
      action: () => insertAtLineStart("## "),
    },
    {
      icon: List,
      title: "Lista com marcadores",
      action: () => insertAtLineStart("- "),
    },
    {
      icon: ListOrdered,
      title: "Lista numerada",
      action: () => insertAtLineStart("1. "),
    },
    {
      icon: Minus,
      title: "Linha horizontal",
      action: () => insertMarkdown("\n---\n"),
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertMarkdown("**", "**");
      } else if (e.key === 'i') {
        e.preventDefault();
        insertMarkdown("_", "_");
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-muted/50 border border-border rounded-t-md px-2 py-1.5">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button, index) => (
            <Button
              key={index}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              onClick={button.action}
              title={button.title}
              disabled={disabled || showPreview}
              data-testid={`markdown-btn-${index}`}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 hover:bg-muted text-xs"
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? "Editar" : "Visualizar"}
          data-testid="markdown-toggle-preview"
        >
          {showPreview ? (
            <>
              <EyeOff className="h-4 w-4" />
              Editar
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Visualizar
            </>
          )}
        </Button>
      </div>

      {showPreview ? (
        <div 
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none p-4 bg-card border border-t-0 border-border rounded-b-md overflow-auto",
            minHeight,
            className
          )}
          data-testid="markdown-preview"
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nenhum conteúdo para visualizar</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "bg-card text-foreground border-border border-t-0 rounded-t-none resize-y",
            minHeight,
            className
          )}
          data-testid="markdown-textarea"
        />
      )}
      
      <p className="text-xs text-muted-foreground">
        Suporta formatação Markdown: **negrito**, _itálico_, - listas, ## títulos
      </p>
    </div>
  );
}

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div 
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        className
      )}
      data-testid="markdown-viewer"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
