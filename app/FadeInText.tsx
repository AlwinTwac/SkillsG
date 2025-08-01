import React, { useEffect, useState } from "react";

interface FadeInTextProps {
  text: string;
  delay?: number;
}

const FadeInText: React.FC<FadeInTextProps> = ({ text, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div
      className={`text-xl font-medium text-indigo-100 tracking-wide transition-opacity duration-1000 ease-in-out ${visible ? "opacity-100" : "opacity-0"}`}
      aria-label={text}
    >
      {text}
    </div>
  );
};

export default FadeInText;
