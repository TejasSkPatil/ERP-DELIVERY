import React from 'react';

export interface FeatureCardItem {
  icon: string;
  title: string;
  description: string;
  linkText?: string;
  linkHref?: string;
}

interface FeatureCardsProps {
  cards?: FeatureCardItem[];
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({
  cards = [
    {
      icon: 'fa-legal',
      title: 'Level HTML Template by Tooplate website',
      description: 'You are allowed to download, edit and use this template for your business or client websites.',
      linkText: 'Continue reading...',
      linkHref: '#',
    },
    {
      icon: 'fa-plane',
      title: 'Original Website Template Producer',
      description: 'You are NOT allowed to re-distribute the downloadable template ZIP file on any website.',
      linkText: 'Continue reading...',
      linkHref: '#',
    },
    {
      icon: 'fa-life-saver',
      title: 'Contact us if you have any question',
      description: 'If you see this template being distributed on any other site, that is an illegal copy.',
      linkText: 'Continue reading...',
      linkHref: '#',
    },
  ],
}) => {
  return (
    <div className="container tm-pt-5 tm-pb-4">
      <div className="row text-center">
        {cards.map((card, idx) => (
          <article
            key={idx}
            className="col-sm-12 col-md-4 col-lg-4 col-xl-4 tm-article"
          >
            <i
              className={`fa tm-fa-6x ${card.icon} tm-color-primary tm-margin-b-20`}
            ></i>
            <h3 className="tm-color-primary tm-article-title-1">{card.title}</h3>
            <p>{card.description}</p>
            {card.linkText && (
              <a
                href={card.linkHref || '#'}
                className="text-uppercase tm-color-primary tm-font-semibold"
              >
                {card.linkText}
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

export default FeatureCards;
