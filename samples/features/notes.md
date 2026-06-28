# Feature Notes

This file lives in a subfolder to demonstrate recursive folder scanning and
relative links that traverse directories.

- Back to [welcome](../welcome.md)
- Jump to [architecture](../architecture.mmd)

## Class diagram

```mermaid
classDiagram
    class Pane {
        +string id
        +string[] tabs
        +string activePath
        +ViewMode view
    }
    class DocState {
        +string path
        +string content
        +string saved
    }
    Pane --> DocState : shows
```
