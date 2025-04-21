const request = require("supertest");
const app = require("./app"); 

describe("POST /api/users/signup", () => {
  it("devrait créer un nouvel utilisateur avec des données valides", async () => {
    const res = await request(app).post("/api/users/signup").send({
      firstName: "John",
      email: "john@gmail.com",
      birthdate: "2000-01-01",
      password: "azerty123",
    });


    expect(res.statusCode).toBe(200); // Vérifie que le statut est 200
    expect(res.body.result).toBe(true); // Vérifie que la création a réussi
  });

  it("devrait retourner une erreur si des champs sont manquants", async () => {
    const res = await request(app).post("/api/users/signup").send({
      firstName: "",
      email: "johailcom",
      birthdate: "2000-01-01",
      password: "azerty123",
    });

    expect(res.statusCode).toBe(200); 
    expect(res.body.result).toBe(false); 
  
  });

  it("devrait retourner une erreur si le format de la date de naissance est invalide", async () => {
    const res = await request(app).post("/api/users/signup").send({
      firstName: "John",
      email: "john@gmail.com",
      birthdate: "invalid-date",
      password: "azerty123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(false); 
    expect(res.body.error).toBe("Invalid birthdate format"); 
  });

  
});