import { useEffect, useRef, useState } from 'react'
import GoogleIcon from '../ui/GoogleIcon'

const NAV_LINKS = [
  { label: 'Início',         href: '#' },
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Preços',         href: '#pricing' },
]

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState('Início')

  useEffect(() => {
    function onScroll() {
      const nav = navRef.current
      if (!nav) return
      if (window.scrollY > 10) {
        nav.classList.add('shadow-sm', 'bg-white/90', 'backdrop-blur-md')
      } else {
        nav.classList.remove('shadow-sm', 'bg-white/90', 'backdrop-blur-md')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 bg-surface border-b border-outline-variant transition-all duration-200"
    >
      <div className="flex items-center gap-xl">
        <span className="font-sans text-headline-md font-extrabold text-primary">Zpply</span>
        <div className="hidden md:flex gap-md">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setActive(label)}
              className={`text-body-md transition-colors duration-200 pb-1 ${
                active === label
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface hover:text-primary'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <a
        href="/auth/google"
        className="inline-flex items-center gap-xs bg-secondary text-on-secondary px-md py-xs rounded-full text-label-md font-bold active:scale-95 transition-all shadow-sm"
      >
        <GoogleIcon className="w-4 h-4" />
        Entrar com Google
      </a>
    </nav>
  )
}
