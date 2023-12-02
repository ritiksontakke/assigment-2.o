// const { ACTION_TYPES } = require('../enums.js')

let oneShotPrompt = ''

const getCommandPrompt = (cleanPromptText, promptType, language) => {
  if (language === 'Spanish') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = 'AI Assistant: como bot asistente, estoy aquí para ayudarlo a abordar los desafíos de programación de manera efectiva. Proporcione una descripción detallada del problema al que se enfrenta, junto con cualquier código o contexto relevante. SIEMPRE lo ayudaré con soluciones de código y explicaciones en formato Markdown. Siéntete libre de utilizar bloques de código Markdown cuando sea necesario para la presentación del código.' + '\n\n' +
        'User: ' + cleanPromptText + '\n\n' + 'AI Assistant: '
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Explica que hace este código: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Refactoriza este código y explica que cambios se hicieron: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Escribe nuevamente este código y agrega comentarios: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Encuentra los problemas del siguiente código, arréglalos y explica que estaba incorrecto: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Escribe un código en '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Explica, escribe e muestra SIEMPRE el resultado del código. Utilice el formato de markdown, por ejemplo: \n\n ```python a = 1 ``` \n\n Utilice el siguiente código como contexto: \n\n '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Portuguese') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Eu sou um assistente especialista em programação útil. Se você me fizer uma pergunta que esteja enraizada na verdade, eu lhe darei a resposta.
        USER:: O que é uma API?
        BOT: Uma API é um conjunto de regras para interagir com software ou serviço.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Explique o que esse código faz: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Otimize este código e explique quais alterações foram feitas: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Documente o seguinte código: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Encontre problemas com o código a seguir, corrija-os e explique o que estava errado: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Escreva um código em '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Escreva o código de teste de unidade para o seguinte código: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'English') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = "AI Assistant: As an AI programming assistant, I'm here to help you tackle coding challenges effectively. Please provide a detailed description of the problem you're facing, along with any relevant code or context. I'll then assist you by providing code solutions and explanations in markdown format. Feel free to use markdown code blocks when necessary for code presentation." + '\n\n' +
        'User:  ' + cleanPromptText + '\n\n' +
        'AI Assistant: '
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Explain what this code does: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Refactor this code and explain what\'s changed: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Document the following code: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Find problems with the following code, fix them and explain what was wrong: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Explain, write and ALWAYS print the result of the code. Use markdown format, for example: \n\n ```python a = 1 ``` \n\n Use the following code: \n\n'
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Write the unit test code for the following code: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'French') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Je suis un assistant expert en programmation utile. Si vous me posez une question qui est enracinée dans la vérité, je vous donnerai la réponse.
        USER: Qu'est-ce qu'une API ?
        BOT: Une API est un ensemble de règles permettant d'interagir avec un logiciel ou un service.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Expliquez ce que fait ce code: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Refactorisez ce code et expliquez ce qui a changé: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Documentez le code suivant: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Trouvez des problèmes avec le code suivant, corrigez-les et expliquez ce qui n\'allait pas: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Écrivez un code dans '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Écrivez le code de test unitaire pour le code suivant: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Japanese') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `私は役に立つプログラミング専門家のアシスタントです。真実に根ざした質問をしてくれれば、答えてあげます。
        USER: API とは何ですか?
        BOT: API は、ソフトウェアまたはサービスと対話するための一連のルールです。
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'このコードが何をするか説明してください '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'このコードをリファクタリングし、どのような変更が行われたかを説明します。 '
        break
      case 'documentCodeGPT':
        oneShotPrompt = '次のコードを文書化します。: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = '次のコードの問題を見つけて修正し、何が問題だったかを説明してください。 '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'にコードを書きます '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = '次のコードの単体テスト コードを記述します。 '
        break
      default:
        // código para ejecutar si expression no coincide con n ni con m
        break
    }
    oneShotPrompt = oneShotPrompt + cleanPromptText
  } else if (language === 'Russian') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Я полезный помощник эксперта по программированию. Если вы зададите мне вопрос, основанный на истине, я дам вам ответ.
        USER: Что такое API?
        BOT: API — это набор правил взаимодействия с программным обеспечением или сервисом.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Объясните, что делает этот код: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Проведите рефакторинг этого кода и объясните, какие изменения были внесены: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Задокументируйте следующий код: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Найдите проблемы в следующем коде, исправьте их и объясните, что было не так: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Напишите код в '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Напишите код модульного теста для следующего кода: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'German') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Ich bin ein hilfreicher Programmierexperten-Assistent. Wenn Sie mir eine Frage stellen, die in der Wahrheit verwurzelt ist, werde ich Ihnen die Antwort geben.
        USER: Was ist eine API?
        BOT: Eine API ist ein Satz von Regeln für die Interaktion mit Software oder einem Dienst.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Erklären Sie, was dieser Code bewirkt: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Überarbeiten Sie diesen Code und erklären Sie, welche Änderungen vorgenommen wurden: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Dokumentieren Sie den folgenden Code: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Finden Sie die Probleme im folgenden Code, beheben Sie sie und erklären Sie, was falsch war: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Schreiben Sie einen Code hinein '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Schreiben Sie den Einheitentestcode für den folgenden Code: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Arabic') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `أنا مساعد خبير برمجة مفيد. إذا سألتني سؤالًا متجذرًا في الحقيقة ، فسأعطيك الجواب.
        USER: ما هي API؟
        BOT: API عبارة عن مجموعة من القواعد للتفاعل مع برنامج أو خدمة.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'اشرح ما يفعله هذا الرمز: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'أعد تشكيل هذا الكود واشرح التغييرات التي تم إجراؤها: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'وثق الكود التالي: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'ابحث عن المشاكل في الكود التالي وقم بإصلاحها واشرح الخطأ: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'اكتب رمزًا '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'اكتب كود اختبار الوحدة للرمز التالي: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Hebrew') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `אני עוזר מומחה לתכנות מועיל. אם תשאל אותי שאלה ששורשיה באמת, אני אתן לך את התשובה.
        USER: מהו API?
        BOT: API הוא קבוצה של כללים לאינטראקציה עם תוכנה או שירות.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'הסבר מה הקוד הזה עושה: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'שחזר את הקוד הזה והסביר אילו שינויים בוצעו: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'כתוב את הקוד הזה שוב והוסף הערות: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'מצא את הבעיות בקוד הבא, תקן אותן והסבר מה השתבש: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'כתוב קוד ב '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'כתוב את קוד בדיקת היחידה עבור הקוד הבא: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Thai') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `ฉันเป็นผู้ช่วยผู้เชี่ยวชาญด้านการเขียนโปรแกรมที่เป็นประโยชน์ หากคุณถามคำถามที่มีรากฐานมาจากความจริง ฉันจะให้คำตอบแก่คุณ
        USER: API คืออะไร
        BOT: API คือชุดของกฎสำหรับการโต้ตอบกับซอฟต์แวร์หรือบริการ
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'อธิบายว่ารหัสนี้ทำอะไร: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'ปรับโครงสร้างรหัสนี้ใหม่และอธิบายสิ่งที่เปลี่ยนแปลง: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'เอกสารรหัสต่อไปนี้: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'ค้นหาปัญหาเกี่ยวกับโค้ดต่อไปนี้ แก้ไขและอธิบายสิ่งที่ผิดพลาด: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'เขียนรหัสใน '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'เขียนรหัสการทดสอบหน่วยสำหรับรหัสต่อไปนี้: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Chinese') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `我是一个乐于助人的编程专家助理。如果你问我一个植根于真理的问题，我会给你答案。
        USER：什么是 API？
        BOT：API 是一组用于与软件或服务交互的规则。
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = '解释这段代码的作用：'
        break
      case 'refactorCodeGPT':
        oneShotPrompt = '重构此代码并解释更改内容：'
        break
      case 'documentCodeGPT':
        oneShotPrompt = '记录以下代码：'
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = '查找以下代码的问题，修复它们并解释错误所在：'
        break
      case 'getCodeGPT':
        oneShotPrompt = '写一段代码进去 '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = '为以下代码编写单元测试代码：'
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Italian') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Sono un utile assistente esperto di programmazione. Se mi fai una domanda radicata nella verità, ti darò la risposta.
        USER: Cos'è un'API?
        BOT: un'API è un insieme di regole per interagire con un software o un servizio.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Spiega cosa fa questo codice: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Rifattorizza questo codice e spiega cosa è cambiato: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Documenta il seguente codice: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Trova i problemi con il seguente codice, correggili e spiega cosa non andava: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Scrivi un codice '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Scrivere il codice unit test per il seguente codice: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Ukrainian') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Я корисний помічник експерта з програмування. Якщо ви задасте мені питання, яке базується на правді, я дам вам відповідь.
        USER: Що таке API?
        BOT: API — це набір правил для взаємодії з програмним забезпеченням або службою.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Поясніть, що робить цей код: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Рефакторіть цей код і поясніть, що змінилося: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Задокументуйте наступний код: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Знайдіть проблеми з наступним кодом, виправте їх і поясніть, що не так: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Введіть код '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Напишіть код модульного тестування для такого коду: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Polish') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Jestem pomocnym asystentem eksperta programistycznego. Jeśli zadasz mi pytanie, które jest zakorzenione w prawdzie, dam ci odpowiedź.
        USER: Co to jest interfejs API?
        BOT: API to zestaw reguł interakcji z oprogramowaniem lub usługą.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Wyjaśnij, co robi ten kod: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Refaktoryzuj ten kod i wyjaśnij, co się zmieniło: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Udokumentuj następujący kod: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Znajdź problemy z następującym kodem, napraw je i wyjaśnij, co było nie tak: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'Wpisz kod w '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Napisz kod testu jednostkowego dla następującego kodu: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Korean') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `저는 도움이 되는 프로그래밍 전문가 조수입니다. 진실에 뿌리를 둔 질문을 하시면 답을 드리겠습니다.
        USER: API란 무엇입니까?
        BOT: API는 소프트웨어 또는 서비스와 상호 작용하기 위한 일련의 규칙입니다.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = '이 코드의 기능을 설명하십시오. '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = '이 코드를 리팩터링하고 변경된 사항을 설명합니다. '
        break
      case 'documentCodeGPT':
        oneShotPrompt = '다음 코드를 문서화합니다. '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = '다음 코드에서 문제를 찾아 수정하고 무엇이 잘못되었는지 설명하십시오. '
        break
      case 'getCodeGPT':
        oneShotPrompt = '에 코드 작성 '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = '다음 코드에 대한 단위 테스트 코드를 작성합니다. '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  } else if (language === 'Turkish') {
    switch (promptType) {
      case 'chatCodeGPT':
        oneShotPrompt = `Yardımcı bir programlama uzmanı asistanıyım. Bana hakikate dayanan bir soru sorarsan, sana cevabını veririm.
        USER: API nedir?
        BOT: Bir API, yazılım veya bir hizmetle etkileşim kurmak için bir dizi kuraldır.
        USER: `
        break
      case 'askCodeGPT':
        oneShotPrompt = ''
        break
      case 'explainCodeGPT':
        oneShotPrompt = 'Bu kodun ne yaptığını açıklayın: '
        break
      case 'refactorCodeGPT':
        oneShotPrompt = 'Bu kodu yeniden düzenleyin ve nelerin değiştiğini açıklayın: '
        break
      case 'documentCodeGPT':
        oneShotPrompt = 'Aşağıdaki kodu belgeleyin: '
        break
      case 'findProblemsCodeGPT':
        oneShotPrompt = 'Aşağıdaki kodla ilgili sorunları bulun, düzeltin ve neyin yanlış olduğunu açıklayın: '
        break
      case 'getCodeGPT':
        oneShotPrompt = 'içine bir kod yaz '
        break
      case 'unitTestCodeGPT':
        oneShotPrompt = 'Aşağıdaki kod için birim test kodunu yazın: '
        break
      default:
      // código para ejecutar si expression no coincide con n ni con m
    }
  }

  if (promptType === 'compileAndRunCodeGPT') {
    oneShotPrompt = `Act as if you were a console, if there is any error it shows the error message if there is not error then Compile and Execute the following code,  Then he explains in ${language} what happened in the execution:
    '''
    ${cleanPromptText}
    '''
    Result:`
  } else {
    oneShotPrompt = oneShotPrompt + cleanPromptText
  }

  return oneShotPrompt
}

module.exports = { getCommandPrompt }
