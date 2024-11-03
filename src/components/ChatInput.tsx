import { useState } from "react";
import { ArrowUp } from "lucide-react";

const ChatInput = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="relative w-full max-w-2xl">
        <textarea
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message ChatGPT"
          className="w-full resize-none rounded-full bg-[#2F2F2F] px-4 py-4 pr-12 focus:outline-none"
          style={{ maxHeight: "200px" }}
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-full hover:bg-gray-200">
          <ArrowUp className="h-4 w-4 text-black" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;