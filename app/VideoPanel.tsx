import React, { useState, useEffect } from "react";

const VideoPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="video-panel">
      <div className="video-panel-title">Top Trending</div>
      <div className="video-panel-window">
        {loading ? (
          <div className="video-loading">
            <div className="video-loader-spinner" />
            <span className="video-loading-text">Loading video...</span>
          </div>
        ) : (
          <video width="210" height="120" controls poster="/video-placeholder.jpg" className="video-element">
            <source src="/mock-trending-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
};

export default VideoPanel;
