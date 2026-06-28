import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useStore } from '../lib/store';

interface EditorProps {
  filePath: string;
}

export default function Editor({ filePath }: EditorProps) {
  const content = useStore((s) => s.docs[filePath]?.content ?? '');
  const updateContent = useStore((s) => s.updateContent);
  const saveDoc = useStore((s) => s.saveDoc);

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
    ],
    []
  );

  // CodeMirror doesn't intercept the OS save shortcut; do it on the wrapper.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveDoc(filePath);
    }
  };

  return (
    <div className="editor-wrap" onKeyDownCapture={onKeyDown}>
      <CodeMirror
        value={content}
        theme={oneDark}
        height="100%"
        extensions={extensions}
        onChange={(val) => updateContent(filePath, val)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
