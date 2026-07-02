// Definição do questionário (orientada a dados).
// Para adaptar o questionário, basta editar este ficheiro — o formulário e a
// validação no servidor são gerados automaticamente a partir daqui.
//
// Tipos suportados:
//   "text"     -> campo de texto curto
//   "email"    -> email (validação básica)
//   "textarea" -> texto longo
//   "rating"   -> escala numérica (usa `min` e `max`)
//   "radio"    -> escolha única (usa `options`)
//   "checkbox" -> escolha múltipla (usa `options`)

export const questionnaire = {
  title: "Questionário de Satisfação",
  description:
    "Ajuda-nos a melhorar! Leva menos de 2 minutos e as tuas respostas são anónimas.",
  questions: [
    {
      id: "nome",
      type: "text",
      label: "Como te chamas? (opcional)",
      required: false,
    },
    {
      id: "email",
      type: "email",
      label: "O teu email (opcional)",
      required: false,
    },
    {
      id: "satisfacao_geral",
      type: "rating",
      label: "Qual o teu nível de satisfação geral?",
      min: 1,
      max: 5,
      required: true,
    },
    {
      id: "funcionalidades",
      type: "checkbox",
      label: "Que funcionalidades usaste? (podes escolher várias)",
      options: ["Pesquisa", "Relatórios", "Notificações", "Suporte", "Exportação"],
      required: false,
    },
    {
      id: "recomendaria",
      type: "radio",
      label: "Recomendarias a um amigo ou colega?",
      options: ["Sim, com certeza", "Talvez", "Não"],
      required: true,
    },
    {
      id: "comentario",
      type: "textarea",
      label: "Algum comentário ou sugestão?",
      required: false,
    },
  ],
};
