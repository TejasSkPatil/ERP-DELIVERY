import React, { useRef, useState } from 'react';

export const VideoMediaSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="tm-bg-video">
      <div className="overlay" onClick={togglePlayPause} style={{ cursor: 'pointer' }}>
        {!isPlaying ? (
          <i className="fa fa-5x fa-play-circle tm-btn-play" style={{ display: 'inline-block' }}></i>
        ) : (
          <i className="fa fa-5x fa-pause-circle tm-btn-pause" style={{ display: 'inline-block' }}></i>
        )}
      </div>
      <video ref={videoRef} loop className="tmVideo">
        <source src="videos/video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="tm-section tm-section-pad tm-bg-img" id="tm-section-5">
        <div className="container ie-h-align-center-fix">
          <div className="row tm-flex-align-center">
            <div className="col-xs-12 col-md-12 col-lg-3 col-xl-3 tm-media-title-container">
              <h2 className="text-uppercase tm-section-title-2">ASIA</h2>
              <h3 className="tm-color-primary tm-font-semibold tm-section-subtitle-2">Singapore</h3>
            </div>
            <div className="col-xs-12 col-md-12 col-lg-9 col-xl-9 mt-0 mt-sm-3">
              <div className="ml-auto tm-bg-white-shadow tm-pad tm-media-container">
                <article className="media tm-margin-b-20 tm-media-1">
                  <img src="img/img-03.jpg" alt="Asia 1" />
                  <div className="media-body tm-media-body-1 tm-media-body-v-center">
                    <h3 className="tm-font-semibold tm-color-primary tm-article-title-3">
                      Suspendisse vel est libero sem phasellus ac laoreet
                    </h3>
                    <p>
                      Vivamus eget tellus ornare, sollicitudin quam id, dictum nulla. Phasellus finibus rhoncus justo, tempus eleifend neque dictum ac. Aenean metus leo, consectetur non.
                      <br /><br />
                      Etiam aliquam arcu at mauris consectetur scelerisque. Integer elementum justo in orci facilisis ultricies. Pellentesque at velit ante. Duis scelerisque metus vel felis porttitor gravida.
                    </p>
                  </div>
                </article>
                <article className="media tm-margin-b-20 tm-media-1">
                  <img src="img/img-04.jpg" alt="Asia 2" />
                  <div className="media-body tm-media-body-1 tm-media-body-v-center">
                    <h3 className="tm-font-semibold tm-article-title-3">
                      Suspendisse vel est libero sem phasellus ac laoreet
                    </h3>
                    <p>
                      Duis accumsan sagittis tortor in ultrices. Praesent tortor ante, fringilla ac nibh porttitor, fermentum commodo nulla.
                    </p>
                    <a href="#tm-section-6" className="text-uppercase tm-color-primary tm-font-semibold">
                      Continue reading...
                    </a>
                  </div>
                </article>
                <article className="media tm-margin-b-20 tm-media-1">
                  <img src="img/img-05.jpg" alt="Asia 3" />
                  <div className="media-body tm-media-body-1 tm-media-body-v-center">
                    <h3 className="tm-font-semibold tm-article-title-3">
                      Faucibus dolor ligula nisl metus auctor aliquet
                    </h3>
                    <p>
                      Nunc in felis aliquet metus luctus iaculis vel et nisi. Nulla venenatis nisl orci, laoreet ultricies massa tristique id.
                    </p>
                    <a href="#tm-section-6" className="text-uppercase tm-color-primary tm-font-semibold">
                      Continue reading...
                    </a>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoMediaSection;
