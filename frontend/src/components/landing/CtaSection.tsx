import GoogleIcon from '../ui/GoogleIcon'

export default function CtaSection() {
  return (
    <section className="py-xl px-margin-mobile md:px-margin-desktop">
      <div className="bg-primary rounded-lg p-xl flex flex-col items-center text-center text-on-primary max-w-[1120px] mx-auto shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <h2 className="font-sans font-extrabold text-[32px] md:text-display-lg mb-md relative z-10">
          Comece a converter agora
        </h2>
        <p className="text-body-lg mb-xl opacity-90 max-w-[600px] relative z-10">
          Experimente gratuitamente. Envie qualquer PDF — relatório, manual, artigo ou contrato — e receba um Markdown pronto para usar com modelos de IA.
        </p>
        <a
          href="/auth/google"
          className="inline-flex items-center gap-sm bg-secondary text-on-secondary px-xl py-md rounded-full font-extrabold text-headline-md hover:scale-105 transition-all shadow-md relative z-10 active:scale-95"
        >
          <GoogleIcon className="w-5 h-5" />
          Começar Agora
        </a>
      </div>
    </section>
  )
}
