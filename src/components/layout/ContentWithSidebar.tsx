import React, { useState } from 'react';
import Sidebar, { SidebarItem } from './Sidebar';

export interface ArticleCard {
  id: number;
  image: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
}

interface ContentWithSidebarProps {
  articles?: ArticleCard[];
  sidebarTitle?: string;
  sidebarDescription?: string;
  sidebarItems?: SidebarItem[];
}

export const ContentWithSidebar: React.FC<ContentWithSidebarProps> = ({
  articles = [
    {
      id: 1,
      image: 'img/img-01.jpg',
      title: 'Nunc in felis aliquet metus luctus iaculis',
      description: 'Aliquam ac lacus volutpat, dictum risus at, scelerisque nulla. Nullam sollicitudin at augue venenatis eleifend. Nulla ligula ligula, egestas sit amet viverra id, iaculis sit amet ligula.',
      buttonText: 'Get More Info.',
    },
    {
      id: 2,
      image: 'img/img-02.jpg',
      title: 'Sed cursus dictum nunc quis molestie',
      description: 'Pellentesque quis dui sit amet purus scelerisque eleifend sed ut eros. Morbi viverra blandit massa in varius. Sed nec ex eu ex tincidunt iaculis. Curabitur eget turpis gravida.',
      buttonText: 'View Detail',
    },
    {
      id: 3,
      image: 'img/img-01.jpg',
      title: 'Eget diam pellentesque interdum ut porta',
      description: 'Aenean finibus tempor nulla, et maximus nibh dapibus ac. Duis consequat sed sapien venenatis consequat. Aliquam ac lacus volutpat, dictum risus at, scelerisque nulla.',
      buttonText: 'More Info.',
    },
    {
      id: 4,
      image: 'img/img-02.jpg',
      title: 'Lorem ipsum dolor sit amet, consectetur',
      description: 'Suspendisse molestie sed dui eget faucibus. Duis accumsan sagittis tortor in ultrices. Praesent tortor ante, fringilla ac nibh porttitor, fermentum commodo nulla.',
      buttonText: 'Detail Info.',
    },
  ],
  sidebarTitle,
  sidebarDescription,
  sidebarItems,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(articles.length / itemsPerPage);

  const displayedArticles = articles.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="tm-section tm-section-pad tm-bg-gray" id="tm-section-4">
      <div className="container">
        <div className="row">
          <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
            <div className="row">
              {displayedArticles.map((article) => (
                <div key={article.id} className="col-sm-12 col-md-6 mb-4">
                  <article className="tm-bg-white tm-carousel-item h-100">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="img-fluid w-100"
                    />
                    <div className="tm-article-pad">
                      <header>
                        <h3 className="text-uppercase tm-article-title-2">
                          {article.title}
                        </h3>
                      </header>
                      <p>{article.description}</p>
                      <a
                        href={article.buttonHref || '#'}
                        className="text-uppercase btn-primary tm-btn-primary"
                      >
                        {article.buttonText}
                      </a>
                    </div>
                  </article>
                </div>
              ))}
            </div>

            {/* Pagination dots matching slick carousel dots */}
            {totalPages > 1 && (
              <div className="text-center mt-3">
                <ul className="slick-dots" style={{ position: 'relative', bottom: '0' }}>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <li
                      key={index}
                      className={currentPage === index ? 'slick-active' : ''}
                      style={{ display: 'inline-block', margin: '0 5px' }}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentPage(index)}
                        style={{
                          background: currentPage === index ? '#ee5057' : '#ccc',
                          border: 'none',
                          borderRadius: '50%',
                          width: '12px',
                          height: '12px',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      ></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Sidebar
            title={sidebarTitle}
            description={sidebarDescription}
            items={sidebarItems}
          />
        </div>
      </div>
    </div>
  );
};

export default ContentWithSidebar;
