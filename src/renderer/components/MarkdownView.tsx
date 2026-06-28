import { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Mermaid from './Mermaid';
import { getElectron } from '../lib/electron';
import { useStore } from '../lib/store';

interface MarkdownViewProps {
  content: string;
  filePath: string;
  ext: string;
  paneId: string;
}

function isExternal(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

export default function MarkdownView({ content, filePath, ext, paneId }: MarkdownViewProps) {
  const openFile = useStore((s) => s.openFile);

  const handleLinkClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
      if (!href) return;
      const api = getElectron();

      if (isExternal(href)) {
        e.preventDefault();
        if (api) api.openExternal(href);
        return;
      }

      // Pure in-document anchors keep default behaviour.
      if (href.startsWith('#')) return;

      // Relative / absolute file references resolve and open in-app.
      e.preventDefault();
      if (!api) return;
      const res = await api.resolveLink(filePath, href);
      if (res.ok && res.exists && res.isFile) {
        openFile(res.path!, paneId);
      } else if (res.ok && res.path) {
        api.openExternal('file://' + res.path).catch(() => {});
      }
    },
    [filePath, openFile, paneId]
  );

  // A standalone Mermaid file renders the whole document as one diagram.
  if (ext === '.mmd') {
    return (
      <div className="markdown-body mermaid-file">
        <Mermaid chart={content} />
      </div>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a href={href} onClick={(e) => handleLinkClick(e, href)} title={href} {...props}>
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];
            const value = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <Mermaid chart={value} />;
            }

            const isInline = !className && !value.includes('\n');
            if (isInline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
