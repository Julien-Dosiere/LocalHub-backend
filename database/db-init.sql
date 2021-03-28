BEGIN;

DROP TABLE IF EXISTS favorites, comments, needs, projects, users;


CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT NULL,
    activated BOOLEAN DEFAULT TRUE
);

INSERT INTO users (name, email, password) VALUES
('Michel','michel@michel', crypt('password1', gen_salt('md5'))),
('Bruce Reynolds','bruce@reynolds', crypt('password1', gen_salt('md5'))),
('Johann Kehl','johannkehl@oclock.com', crypt('password1', gen_salt('md5'))),
('Johanna Rolland','johannarolland@oclock.com', crypt('password1', gen_salt('md5')));


CREATE TABLE projects (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    lat FLOAT NOT NULL,
    long FLOAT NOT NULL,
    image TEXT NULL,
    file TEXT NULL,
    archived BOOLEAN DEFAULT FALSE,
    author INT REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO projects (expiration_date, title, description, location, lat, long, author, archived, image) VALUES
('2021-02-08 12:00:00','Local-hub',
'Developper une super appli qui permettra de mettre en relation les acteurs d’un périmètre géographique de même intérêt afin de faciliter le démarrage de projets'
, 'Coueron', 47.230998, -1.72929, 3, FALSE,
'/project-images/locate-300x273.png'),
('2021-03-20 12:00:00','Crèche de Saint-Herblain',
'Les bâtiments en direction des scolaires ou de la petite enfance sont un terrain de prédilection de l’agence et un volet important de son activité. Construits ou réhabilités, souvent dans des communes de moins de 1 500 habitants, ils répondent aux besoins d’une population en augmentation. Lieu de vie principal des communes ou des quartiers, nos constructions dans ce domaine respectent et valorisent, dans un souci d’intégration la nature et l’histoire du pays où ils sont implantés. Tous nos groupes scolaires intègrent (en plus des espaces destinés aux différentes classes d’âge) des espaces...'
, 'Saint-Herblain', 47.2259, -1.6394, 1, FALSE, '/project-images/2014-Narbonne-060-Patio-central-Architecte-Pascale-Deffayet_cr1-1170x539.jpg'),
('2020-07-14 12:00:00','Potager Urbain',
'L’agriculture urbaine est en plein essor et ce, partout dans le monde. Les agglomérations se sont progressivement vidées de leur maraîchers. C’est dans ce contexte qu’ECOVEGETAL a développé un système permettant de reconquérir ce territoire perdu au profit de l’urbanisation.
L’intérêt est de raccourcir le circuit entre consommateur et producteur, de fournir de la nourriture localement et de revaloriser des variétés anciennes (pommes, tomates, salades …). L’agriculture urbaine est aussi source d’emplois, de lieux de partage et de convivialité comme peuvent l’être un parc ou un jardin.'
, 'Nantes', 47.2272, -1.5631, 4, TRUE,
'/project-images/36239-potager-urbain-ouvre-sur-toit-hotel-parisien-recolter-propres-produits-saison.webp');


CREATE TABLE needs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE
);


INSERT INTO needs (title, description, project_id, completed) VALUES
('5 developpeurs', 'Necessite 5 fantastiques developpeurs  en JS', 1, FALSE),
('1 architecte', 'Concevoir une étude de faisabilité du projet sur le site la Vallée', 2, TRUE),
('1 mettreur', 'Réaliser les mesures necessaires lors de la construction', 2, FALSE),
('1 chargé de travaux', 'Prendre en charge la direction d’une équipe de 90 personnes chargée de la réalisation des travaux', 2, FALSE),
('3 jardiniers paysagistes', 'L’équipe de jardinier sera chargée de la réalisation du jardin', 3, TRUE),
('1 maçon', 'Construire les bacs necessaires selon les plans de l’architecte', 3, TRUE);

CREATE TABLE comments (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    author INT REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO comments (content, project_id, author) VALUES
('ceci est un commentaire', 1, 1),
('ceci est un autre commentaire', 1, 1),
('ca a lair bien, je peux venir avec ma ptite soeur?', 2, 1),
('oui par contre le repas nest pas assuré', 2, 2);


CREATE TABLE favorites (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE
);

INSERT INTO favorites (user_id, project_id) VALUES
(1, 2),
(2, 1),
(1, 3),
(2, 3);


COMMIT;
