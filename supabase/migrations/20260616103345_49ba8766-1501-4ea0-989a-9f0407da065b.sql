
UPDATE public.curriculum_units SET title_nl=v.title_nl, title_ar=v.title_ar, cefr_from=v.cefr, week_start=v.week, week_end=v.week
FROM (VALUES
('U1',1,'Kennismaking','أَنَا وأنتِ','pre-A1 → A1.1'),
('U2',2,'Familie & Beroepen','العائلة والمِهَن','A1.1'),
('U3',3,'Dagelijkse Routine','الروتين اليومي','A1.1'),
('U4',4,'De Markt & De Tijd','السُّوقُ والوقت','A1.1'),
('U5',5,'Vervoer & Route','النقل والطريق','A1.1 → A1/A2'),
('U6',6,'Weer & Seizoenen','',''),
('U7',7,'Vrije Tijd & Hobby''s','',''),
('U8',8,'Gastronomie & Restaurant','',''),
('U9',9,'Reizen & Toekomstplannen','',''),
('U10',10,'Sociale wensen, feesten & vergelijken','',''),
('U11',11,'Wonen & Huisomgeving','','A1.1 → A1.2'),
('U12',12,'Werk & Professionele Identiteit','','A1.1 → A1.2'),
('U13',13,'Beroep & Identiteit','','A1.2 + A2 receptief'),
('U14',14,'Bezoek & Gastvrijheid','','A1.2'),
('U15',15,'Integratie & Synthese','','A2.1'),
('U17',17,'Milieu & Duurzaamheid','',''),
('U18',18,'Milieu (productieweek)','',''),
('U19',19,'Gezondheid & Welzijn','',''),
('U20',20,'Arbeidsrecht & Ethiek','','')
) AS v(code, week, title_nl, title_ar, cefr)
WHERE public.curriculum_units.code = v.code;
