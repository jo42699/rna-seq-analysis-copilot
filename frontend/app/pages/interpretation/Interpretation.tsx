"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/app/components/layout/AppShell";
import { Markdown } from "@/app/components/ui/Markdown";

import {
  buildInitialInterpretation,
  fetchLLMReport,
  savedAnalyses,
} from "@/app/constants/interpretation";

import { useJob } from "@/app/context/Jobcontext";

type Message = {
  role: "assistant" | "user";
  text: string;
};

type ChatResponse = {
  response?: string;
  answer?: string;
  message?: string;
};

export function InterpretationPage() {
  const { jobId } = useJob();

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [draft, setDraft] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  /**
   * ---------------------------------------------------------
   * LOAD LLM INTERPRETATION
   * ---------------------------------------------------------
   *
   * fetchLLMReport() now polls the backend until the
   * LLM report is actually available.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      /**
       * No job yet.
       */
      if (!jobId) {
        if (!cancelled) {
          setMessages([
            {
              role: "assistant",
              text: "No report uploaded yet.",
            },
          ]);

          setLoading(false);
        }

        return;
      }

      /**
       * New job means new loading cycle.
       */
      setLoading(true);

      try {
        /**
         * This waits for the real LLM output.
         *
         * It does NOT immediately return EMPTY_LLM_OUTPUT
         * while the backend is processing.
         */
        const data = await fetchLLMReport(jobId);

        if (cancelled) return;

        if (!data) {
          setMessages([
            {
              role: "assistant",
              text:
                "The interpretation report is still being generated. " +
                "Please wait a moment and try again.",
            },
          ]);
          return;
        }

        /**
         * Only now populate the chat.
         */
        setMessages([
          {
            role: "assistant",
            text: buildInitialInterpretation(data),
          },
        ]);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Failed to load interpretation:",
          error
        );

        setMessages([
          {
            role: "assistant",
            text:
              "The interpretation report is still being generated. " +
              "Please wait a moment and try again.",
          },
        ]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    /**
     * Cancel the request lifecycle if the page changes
     * or jobId changes.
     */
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  /**
   * ---------------------------------------------------------
   * SEND CHAT MESSAGE
   * ---------------------------------------------------------
   */
  async function send(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || sending || !jobId) {
      return;
    }

    /**
     * Add user message immediately.
     */
    setMessages((items) => [
      ...items,
      {
        role: "user",
        text: message,
      },
    ]);

    setDraft("");
    setSending(true);

    try {
      const response = await fetch(
        "http://localhost:8000/llm/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            job_id: jobId,
            message,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Chat request failed with status ${response.status}`
        );
      }

      const data: ChatResponse =
        await response.json();

      const assistantResponse =
        data.response ??
        data.answer ??
        data.message ??
        "The AI returned an empty response.";

      if (!assistantResponse) {
        return;
      }

      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: assistantResponse,
        },
      ]);
    } catch (error) {
      console.error(
        "Failed to send chat message:",
        error
      );

      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text:
            "Unable to get a response from the AI service. " +
            "Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell rightPanel={false}>
      <main className="chat-layout">

        {/* ------------------------------------------------ */}
        {/* SAVED ANALYSES                                  */}
        {/* ------------------------------------------------ */}

        <aside className="conversation-list">
          <h3>Saved analyses</h3>

          {savedAnalyses.map((item) => (
            <button key={item}>
              {item}
            </button>
          ))}
        </aside>

        {/* ------------------------------------------------ */}
        {/* CHAT                                             */}
        {/* ------------------------------------------------ */}

        <section className="chat-main">

          <div className="chat-history">

            {/* -------------------------------------------- */}
            {/* LOADING                                       */}
            {/* -------------------------------------------- */}

            {loading && (
              <article className="message assistant">
                <Markdown
                  text={
                    "Loading RNA-seq interpretation..."
                  }
                />
              </article>
            )}

            {/* -------------------------------------------- */}
            {/* MESSAGES                                     */}
            {/* -------------------------------------------- */}

            {messages.map(
              (message, index) => (
                <article
                  className={`message ${message.role}`}
                  key={index}
                >
                  <Markdown
                    text={message.text}
                  />
                </article>
              )
            )}

            {/* -------------------------------------------- */}
            {/* SENDING                                       */}
            {/* -------------------------------------------- */}

            {sending && (
              <article className="message assistant">
                <Markdown text="Thinking..." />
              </article>
            )}

            {/* -------------------------------------------- */}
            {/* READY                                         */}
            {/* -------------------------------------------- */}

            {!loading && !sending && (
              <div className="typing">
                Copilot ready for follow-up questions
              </div>
            )}
          </div>

          {/* ------------------------------------------------ */}
          {/* INPUT                                            */}
          {/* ------------------------------------------------ */}

          <form
            className="chat-input"
            onSubmit={send}
          >
            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              placeholder={
                jobId
                  ? "Ask about the data, results, or next steps..."
                  : "Upload an analysis before asking questions..."
              }
              disabled={
                sending || !jobId
              }
            />

            <button
              type="submit"
              disabled={
                sending ||
                !draft.trim() ||
                !jobId
              }
            >
              {sending
                ? "Sending..."
                : "Send"}
            </button>
          </form>

        </section>
      </main>
    </AppShell>
  );
}