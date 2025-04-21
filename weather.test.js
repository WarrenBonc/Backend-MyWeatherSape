const request = require("supertest");
const app = require("./app");


describe("GET /api/weather/7days-hourly/:city", () => {
  it("devrait retourner la prévision horaire sur 7 jours pour une ville valide", async () => {
    const res = await request(app).get("/api/weather/7days-hourly/Paris");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("city", "Paris");
    expect(res.body).toHaveProperty("forecast");

    const forecast = res.body.forecast;
    const dates = Object.keys(forecast);

    expect(dates.length).toBeGreaterThan(0); // On a bien plusieurs jours

    const exampleDay = forecast[dates[0]];
    expect(exampleDay).toHaveProperty("condition");
    expect(exampleDay).toHaveProperty("hours");
    expect(exampleDay.hours).toBeInstanceOf(Array);
    expect(exampleDay.hours.length).toBeGreaterThan(0);

    const firstHour = exampleDay.hours[0];
    expect(firstHour).toHaveProperty("hour");
    expect(firstHour).toHaveProperty("temperature");
    expect(firstHour).toHaveProperty("feels_like");
  });

  it("devrait retourner une erreur 404 pour une ville inexistante", async () => {
    const res = await request(app).get(
      "/api/weather/7days-hourly/VilleInexistanteTest"
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Ville introuvable");
  });
});



