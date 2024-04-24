import React from 'react';
import { Link } from 'react-router-dom';
import '../css/portifolioPage.css'

function PortfolioPage() {
  return (
    <>
      {/* Cabeçalho */}
      <header>
        <h1>Gerenciamento de Qualidade do Ar</h1>
        <nav>
          <ul>
            <li><a href="#home">Início</a></li>
            <Link to="/auth">
              <li><a>Aplicação</a></li>
            </Link>
            <li><a href="#about">Sobre</a></li>
            <li><a href="#skills">Habilidades</a></li>
            <li><a href="#education">Educação</a></li>
            <li><a href="#work">Projetos</a></li>
            <li><a href="#experience">Experiência</a></li>
            <li><a href="#contact">Contato</a></li>
          </ul>
        </nav>
      </header>

      {/* Seção Inicial */}
      <section className="home" id="home">
        <div className="container">
          <h2>Bem-vindo ao Gerenciamento de Qualidade do Ar</h2>
          <p>O nosso dispositivo de gerenciamento de qualidade do ar é compatível com sistemas de automação residencial e tem como objetivo principal proteger as pessoas garantindo a qualidade do ar em ambientes internos.</p>
        </div>
      </section>

      {/* Seção Sobre */}
      <section className="about" id="about">
        <div className="container">
          <h2>Sobre Nós</h2>
          <p>Somos uma equipe dedicada ao desenvolvimento de soluções inovadoras para melhorar a qualidade do ar que respiramos em nossos lares. Nosso dispositivo é projetado para ser fácil de usar, eficiente e altamente compatível com sistemas de automação residencial existentes.</p>
        </div>
      </section>

      {/* Seção Habilidades */}
      <section className="skills" id="skills">
        <div className="container">
          <h2>Nossas Habilidades</h2>
          <ul>
            <li>Desenvolvimento de Dispositivos IoT</li>
            <li>Análise de Qualidade do Ar</li>
            <li>Integração com Sistemas de Automação Residencial</li>
            <li>UI/UX Design</li>
          </ul>
        </div>
      </section>

      {/* Seção Educação */}
      <section className="education" id="education">
        <div className="container">
          <h2>Nossa Educação</h2>
          <p>Nossa equipe possui formação em Engenharia Eletrônica, Ciência da Computação e Design de Produtos, garantindo uma abordagem multidisciplinar para o desenvolvimento de soluções de qualidade do ar.</p>
        </div>
      </section>

      {/* Seção Projetos */}
      <section className="work" id="work">
        <div className="container">
          <h2>Nossos Projetos</h2>
          <p>Confira alguns dos projetos em que estivemos envolvidos para melhorar a qualidade do ar em ambientes internos:</p>
          <ul>
            <li>Projeto A: Sistema de Monitoramento de Qualidade do Ar</li>
            <li>Projeto B: Dispositivo de Filtragem Avançada</li>
            <li>Projeto C: Integração com Assistente Residencial</li>
          </ul>
        </div>
      </section>

      {/* Seção Experiência */}
      <section className="experience" id="experience">
        <div className="container">
          <h2>Nossa Experiência</h2>
          <p>Com mais de 5 anos de experiência no campo da qualidade do ar e da automação residencial, nossa equipe está preparada para enfrentar os desafios mais complexos e fornecer soluções inovadoras para nossos clientes.</p>
        </div>
      </section>

      {/* Seção Contato */}
      <section className="contact" id="contact">
        <div className="container">
          <h2>Entre em Contato</h2>
          <p>Estamos ansiosos para ouvir de você! Entre em contato conosco para mais informações sobre nossos produtos e serviços.</p>
          <form>
            <input type="text" placeholder="Seu Nome" />
            <input type="email" placeholder="Seu Email" />
            <textarea placeholder="Sua Mensagem"></textarea>
            <button>Enviar Mensagem</button>
          </form>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="footer">

        <Link to="/slides">
          <p>&copy; 2024 Gerenciamento de Qualidade do Ar</p>
        </Link>
      </footer>
    </>
  );
}

export default PortfolioPage;
