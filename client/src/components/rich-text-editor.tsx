import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2, Minus, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useCallback } from 'react';
import TurndownService from 'turndown';
import Showdown from 'showdown';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  id?: string;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

const showdownConverter = new Showdown.Converter({
  simpleLineBreaks: true,
  strikethrough: true,
});

function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return turndownService.turndown(html);
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  return showdownConverter.makeHtml(markdown);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite o texto...",
  className,
  minHeight = "min-h-48",
  disabled = false,
  id,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: markdownToHtml(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentMarkdown = htmlToMarkdown(editor.getHTML());
      if (currentMarkdown !== value) {
        editor.commands.setContent(markdownToHtml(value));
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const ToolbarButton = useCallback(({ 
    onClick, 
    isActive = false, 
    title, 
    children,
    testId,
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    title: string;
    children: React.ReactNode;
    testId: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0 hover:bg-muted",
        isActive && "bg-muted text-primary"
      )}
      onClick={onClick}
      title={title}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </Button>
  ), [disabled]);

  if (!editor) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-md", minHeight)} />
    );
  }

  return (
    <div className="space-y-0" id={id}>
      <div className="flex items-center justify-between bg-muted/50 border border-border rounded-t-md px-2 py-1.5">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Negrito (Ctrl+B)"
            testId="richtext-btn-bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Itálico (Ctrl+I)"
            testId="richtext-btn-italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Título"
            testId="richtext-btn-heading"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Lista com marcadores"
            testId="richtext-btn-bullet-list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Lista numerada"
            testId="richtext-btn-ordered-list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linha horizontal"
            testId="richtext-btn-hr"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Desfazer (Ctrl+Z)"
            testId="richtext-btn-undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Refazer (Ctrl+Y)"
            testId="richtext-btn-redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "bg-card text-foreground border border-t-0 border-border rounded-b-md",
          "p-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]",
          "[&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)]",
          "[&_.ProseMirror.is-editor-empty]:before:text-muted-foreground",
          "[&_.ProseMirror.is-editor-empty]:before:float-left",
          "[&_.ProseMirror.is-editor-empty]:before:h-0",
          "[&_.ProseMirror.is-editor-empty]:before:pointer-events-none",
          disabled && "opacity-50 cursor-not-allowed",
          minHeight,
          className
        )}
        data-testid="richtext-editor"
      />
      
      <p className="text-xs text-muted-foreground mt-2">
        Use a barra de ferramentas para formatar o texto. Atalhos: Ctrl+B (negrito), Ctrl+I (itálico)
      </p>
    </div>
  );
}

export { htmlToMarkdown, markdownToHtml };
