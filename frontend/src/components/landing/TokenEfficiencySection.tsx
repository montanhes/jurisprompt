export default function TokenEfficiencySection() {
  return (
    <section className="py-xl bg-surface-container-low px-margin-mobile md:px-margin-desktop border-y border-outline-variant">
      <div className="max-w-[1120px] mx-auto">
        <div className="mb-xl">
          <h2 className="font-sans font-bold text-headline-lg text-primary mb-base">Eficiência de Tokens</h2>
          <p className="text-body-md text-on-surface-variant">
            Veja como a estruturação inteligente reduz o volume de dados processados sem perder nenhuma informação do documento original.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {/* PDF Convencional */}
          <div className="bg-surface p-xl rounded-lg border border-outline-variant flex flex-col justify-between transition-all hover:border-primary/50">
            <div>
              <div className="flex justify-between items-start mb-lg">
                <div className="p-sm bg-surface-container-highest/50 rounded">
                  <span className="material-symbols-outlined text-outline" style={{ fontSize: 32 }}>picture_as_pdf</span>
                </div>
                <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Formato Original</span>
              </div>
              <h3 className="font-sans font-bold text-headline-md text-on-surface mb-sm">PDF Convencional</h3>
              <p className="text-body-md text-on-surface-variant mb-xl">
                Texto bruto com metadados desnecessários, espaços vazios e ruídos de formatação que consomem janelas de contexto e reduzem a qualidade das respostas.
              </p>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-xs">
                <span className="font-sans font-extrabold text-display-lg text-on-surface">300k</span>
                <span className="text-label-md text-on-surface-variant">tokens/média</span>
              </div>
              <div className="w-full bg-outline-variant h-2 rounded-full mt-sm" />
            </div>
          </div>

          {/* Markdown Estruturado */}
          <div className="relative bg-surface p-xl rounded-lg border-2 border-primary flex flex-col justify-between shadow-lg overflow-hidden transition-all">
            <div className="absolute top-0 right-0 bg-primary text-on-primary px-md py-1 rounded-bl font-bold text-label-sm uppercase tracking-widest">
              Otimizado por Zpply
            </div>
            <div>
              <div className="p-sm bg-primary/10 w-fit rounded mb-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>terminal</span>
              </div>
              <h3 className="font-sans font-bold text-headline-md text-primary mb-sm">Markdown Estruturado</h3>
              <p className="text-body-md text-on-surface-variant mb-xl">
                Hierarquia lógica, remoção de ruídos e limpeza de caracteres. Ideal para RAG, sumarização, classificação e qualquer pipeline de IA.
              </p>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-xs">
                <span className="font-sans font-extrabold text-display-lg text-primary">100k</span>
                <span className="text-label-md text-primary">tokens/média</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-sm overflow-hidden">
                <div className="bg-primary h-full w-1/3" />
              </div>
              <div className="mt-sm flex items-center gap-xs text-primary text-label-md font-bold">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                66% mais econômico
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
