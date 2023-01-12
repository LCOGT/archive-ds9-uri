import {
  useState,
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import {
  htmlIdGenerator,
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
} from "@elastic/eui";
import { Plugin, PluggableList } from "unified";
import visit from "unist-util-visit";

import type { Toast } from "@elastic/eui/src/components/toast/global_toast_list";
import type { MainToast } from "../main/toast";

interface ToastContextType {
  addToast: (t: Partial<Toast>) => void;
  toasts: Toast[];
  onDismissToast: (t: Toast) => void;
}

const ToastContext = createContext<ToastContextType>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState([]);
  const toastId = htmlIdGenerator("toast");

  const addToast = (t: Partial<Toast>): void => {
    if (t.toastLifeTimeMs === undefined) {
      switch (t.color) {
        case "success": {
          t.toastLifeTimeMs = 6000;
          break;
        }
        case "warning": {
          t.toastLifeTimeMs = 3000;
          break;
        }
        case "danger": {
          t.toastLifeTimeMs = 9000;
          break;
        }
      }
    }
    setToasts((toasts) => {
      return [...toasts, { ...t, id: toastId() }];
    });
  };

  const onDismissToast = (dismissed: Toast): void => {
    setToasts((toasts) => {
      return toasts.filter((t) => t.id !== dismissed.id);
    });
  };

  useEffect(() => {
    return window.main.toasts.subscribe((t: MainToast) => {
      if (t.markdown !== undefined) {
        const { markdown, ...rest } = t;
        t = {
          ...rest,
          text: (
            <EuiMarkdownFormat parsingPluginList={markdownParsingPluginList}>
              {markdown}
            </EuiMarkdownFormat>
          ),
        };
      }
      addToast(t);
    });
  }, []);

  const value = useMemo(() => {
    return { addToast, toasts, onDismissToast };
  }, [toasts]);

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};

const markdownCodeFormatPlugin: Plugin = () => {
  return (ast) => {
    return visit(ast, "code", (node) => {
      const { data = {} } = node;

      node.data = data;
      data.hProperties = {
        ...((typeof data.hProperties === "object" && data.hProperties) || {}),
        whiteSpace: "pre",
      };
    });
  };
};

const markdownParsingPluginList: PluggableList = [
  ...getDefaultEuiMarkdownParsingPlugins(),
  [markdownCodeFormatPlugin, {}],
];
