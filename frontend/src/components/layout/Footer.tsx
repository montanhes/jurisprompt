export default function Footer() {
  return (
    <footer className="w-full px-margin-mobile md:px-margin-desktop py-xl flex flex-col md:flex-row justify-between items-center gap-md bg-surface border-t border-outline-variant">
      <div className="flex flex-col gap-xs items-center md:items-start">
        <span className="text-headline-md font-extrabold text-primary">Zpply</span>
        <span className="text-body-md text-on-surface-variant">© {new Date().getFullYear()} Zpply. Todos os direitos reservados.</span>
      </div>
      <div className="flex flex-wrap justify-center gap-md">
        {['Política de Privacidade', 'Termos de Uso', 'Suporte'].map(link => (
          <a
            key={link}
            href="#"
            className="text-body-md text-on-surface-variant hover:text-primary transition-colors"
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  )
}
