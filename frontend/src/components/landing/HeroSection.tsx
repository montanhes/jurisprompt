import Badge from '../ui/Badge'
import GoogleIcon from '../ui/GoogleIcon'

export default function HeroSection() {
  function scrollToFeatures(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative pt-xl pb-24 px-margin-mobile md:px-margin-desktop overflow-hidden">
      <div className="max-w-[1120px] mx-auto flex flex-col items-center text-center">
        <Badge className="mb-sm">Conversão de Alta Precisão</Badge>

        <h1 className="font-sans font-extrabold text-[32px] md:text-display-lg leading-[1.15] tracking-tight mb-md max-w-4xl text-primary">
          Qualquer PDF em{' '}
          <span className="text-secondary">Markdown estruturado</span>
        </h1>

        <p className="text-body-lg text-on-surface-variant mb-xl max-w-2xl mx-auto">
          Transforme relatórios, manuais, artigos, contratos e qualquer documento em Markdown
          otimizado para LLMs. Menos tokens, mais precisão — para qualquer área.
        </p>

        <div className="flex flex-col md:flex-row gap-md w-full md:w-auto">
          <a
            href="/auth/google"
            className="inline-flex items-center justify-center gap-sm bg-primary text-on-primary px-xl py-md rounded-full text-label-md font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <GoogleIcon className="w-4 h-4 brightness-0 invert" />
            Começar Agora
          </a>
          <button
            onClick={scrollToFeatures}
            className="border border-primary text-primary bg-transparent px-xl py-md rounded-full text-label-md font-semibold hover:bg-surface-container-low transition-all"
          >
            Ver Demo
          </button>
        </div>
      </div>

      {/* Background blobs */}
      <div className="absolute -z-10 top-0 right-0 w-[500px] h-[500px] bg-primary-container/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -z-10 bottom-0 left-0 w-[400px] h-[400px] bg-secondary-container/10 blur-[100px] rounded-full pointer-events-none" />
    </section>
  )
}
