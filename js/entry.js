// Links educativos vindos do laboratório usam a navegação existente.
const educationalEntry = new URLSearchParams(location.search).get("screen");
if (
  ["screening", "action-post", "rights", "edu-center"].includes(
    educationalEntry,
  )
)
  navigateTo(educationalEntry);
