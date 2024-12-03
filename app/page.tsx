"use client";
import Image from "next/image";
import f1 from "./assets/f1.png";
import { useChat } from "ai/react";
import { Message } from "ai";
import Bubble from "./components/Bubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";
import LoadingBubble from "./components/LoadingBubble";

const Home = () => {
  const {
    input,
    append,
    isLoading,
    messages,
    handleInputChange,
    handleSubmit,
  } = useChat();

  const noMessages = !messages || messages.length === 0;

  const handlePromptClick = (promptText) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    append(msg);
  };

  return (
    <main>
      <Image src={f1} width="250" alt="F1GPT Logo" />
      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <p className="starter-text">
              The ultimate place for Formula One super Fans! Ask F1GPT anything
              about the fantastic topic of F1 racing and it will come back with
              the most up to date answers! We hope you enjoy!
            </p>
            <br />
            <PromptSuggestionsRow onPromptClick={handlePromptClick} />
          </>
        ) : (
          <>
            {/* map messages onto next bubbles */}
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message}></Bubble>
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <input
          className="question-box"
          onChange={handleInputChange}
          value={input}
          placeholder="Ask me something..."
        />
        <input type="submit" />
      </form>
    </main>
  );
};

export default Home;
