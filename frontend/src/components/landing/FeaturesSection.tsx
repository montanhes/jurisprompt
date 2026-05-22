export default function FeaturesSection() {
  return (
    <section id="features" className="py-xl px-margin-mobile md:px-margin-desktop bg-surface">
      <div className="max-w-[1120px] mx-auto mb-xl">
        <h2 className="font-sans font-bold text-headline-lg text-primary mb-base">Por que usar o Zpply?</h2>
        <p className="text-body-md text-on-surface-variant">Tudo que você precisa para transformar documentos em dados prontos para IA.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-gutter max-w-[1120px] mx-auto">

        {/* Estruturação Inteligente — col-span-2 */}
        <div className="md:col-span-2 glass-card p-xl rounded-lg flex flex-col justify-end min-h-[280px]">
          <span className="material-symbols-outlined text-primary mb-md" style={{ fontSize: 40 }}>auto_awesome</span>
          <h3 className="font-sans font-bold text-headline-md text-primary mb-xs">Estruturação Inteligente</h3>
          <p className="text-body-md text-on-surface-variant">
            O sistema identifica títulos, seções, tabelas e listas automaticamente, organizando o conteúdo em uma hierarquia semântica clara — independente do tipo de documento.
          </p>
        </div>

        {/* Processamento Ultra Rápido */}
        <div className="glass-card p-xl rounded-lg flex flex-col justify-center items-center text-center bg-secondary/10 min-h-[280px]">
          <span className="material-symbols-outlined text-secondary mb-md" style={{ fontSize: 48 }}>bolt</span>
          <h3 className="font-sans font-bold text-headline-md text-on-surface mb-xs">Processamento Rápido</h3>
          <p className="text-body-md text-on-surface-variant">Centenas de páginas convertidas em poucos minutos, direto na fila.</p>
        </div>

        {/* Privacidade Total */}
        <div className="glass-card p-xl rounded-lg flex flex-col justify-center bg-surface-container-low min-h-[280px]">
          <span className="material-symbols-outlined text-primary mb-md" style={{ fontSize: 32 }}>lock</span>
          <h3 className="font-sans font-bold text-headline-md text-primary mb-xs">Dados Seguros</h3>
          <p className="text-body-md text-on-surface-variant">
            Seus documentos são processados em ambiente isolado e jamais utilizados para treinamento de modelos.
          </p>
        </div>

        {/* Integração API Nativa — col-span-2 */}
        <div className="md:col-span-2 glass-card rounded-lg relative overflow-hidden flex items-center p-xl min-h-[280px]">
          <div className="relative z-10 w-full md:w-1/2">
            <h3 className="font-sans font-bold text-headline-md text-primary mb-xs">Integração via API</h3>
            <p className="text-body-md text-on-surface-variant">
              Automatize a conversão de documentos no seu próprio pipeline via REST API. Funciona com qualquer linguagem ou plataforma.
            </p>
          </div>
          {/* Code decoration */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 md:opacity-40 bg-gradient-to-l from-inverse-surface to-transparent flex items-center justify-center">
            <pre className="text-inverse-on-surface text-xs font-mono leading-relaxed px-lg select-none">
              {`POST /convert\nContent-Type: multipart/form-data\n\n{\n  "markdown": "# Relatório\\n..."\n}`}
            </pre>
          </div>
        </div>

      </div>
    </section>
  )
}
