/* global SwaggerUIBundle, SwaggerUIStandalonePreset */
window.onload = function () {
  if (typeof SwaggerUIBundle === 'undefined') {
    document.getElementById('swagger-ui').textContent = 'Swagger UI est indisponible. Le contrat reste accessible sur /openapi.json.';
    return;
  }
  SwaggerUIBundle({
    url: '/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    filter: true,
    displayOperationId: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 0,
    supportedSubmitMethods: ['get','post','patch'],
    validatorUrl: null,
    persistAuthorization: false,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout'
  });
};
