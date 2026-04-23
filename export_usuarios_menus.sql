--
-- PostgreSQL database dump
--

\restrict ja5WTNBZPmcSpW593c8LGqfRBzkdrN4HkfpLUA3Lgn7KOaejOwSb8wkpOSxFssS

-- Dumped from database version 15.16 (Debian 15.16-1.pgdg13+1)
-- Dumped by pg_dump version 15.16 (Debian 15.16-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: admin
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.menus DISABLE TRIGGER ALL;

INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (1, 'Panel Admin', NULL, 'ShieldAlert', NULL, 1);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (2, 'Archivos', NULL, 'Folder', NULL, 2);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (3, 'Ventas', NULL, 'ShoppingCart', NULL, 3);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (4, 'Gestión Usuarios', '/usuarios', 'Users', 1, 1);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (8, 'Punto de Venta', '/pos', 'CreditCard', 3, 1);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (9, 'Tipos de Resp.', '/archivos/tipos-resp', 'ReceiptText', 2, 3);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (10, 'Tipos de Doc.', '/archivos/tipos-doc', 'FileSignature', 2, 4);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (11, 'Listas de Precios', '/archivos/listas-precios', 'Tags', 2, 5);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (12, 'Vendedores', '/archivos/vendedores', 'Contact2', 2, 6);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (6, 'Clientes', '/clientes', 'UserCheck', 3, 2);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (13, 'Puntos de Venta', '/puntos-venta', 'MonitorSmartphone', 1, 3);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (14, 'Tasas impositivas (IVA)', '/tasas-iva', 'Landmark', 1, 4);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (15, 'Rubros / Categorías', '/archivos/categorias', 'Boxes', 2, 7);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (7, 'Productos', '/archivos/productos', 'Package', 2, 2);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (5, 'Datos Fiscales (Mi Empresa)', '/config/empresa', 'Building2', 1, 2);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (17, 'Cotizaciones', '/cotizaciones', 'FileSpreadsheet', 3, 1);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (18, 'Plantillas PDF', '/plantillas', 'Code2', 1, 3);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (19, 'Compras', NULL, 'ShoppingCart', NULL, 4);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (20, 'Proveedores', '/proveedores', 'Truck', 19, 1);
INSERT INTO public.menus (id, nombre, ruta, icono, parent_id, orden) VALUES (21, 'Zonas de Entrega', '/archivos/zonas', 'MapPin', 2, 8);


ALTER TABLE public.menus ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

INSERT INTO public.users (id, email, hashed_password, is_admin, nombre) VALUES (1, 'jnegrete@gmail.com', '$2b$12$0QxvcXgq/MDHNvlLPHiUUujjJUgFd.pidtxWZ.SOfRBNZYQ9kTpHe', true, 'Jorge');
INSERT INTO public.users (id, email, hashed_password, is_admin, nombre) VALUES (2, 'test@test', '$2b$12$aDBf/XA2pvOa7rezBIL58.6pZBHJGgIACfo1Xk9qavbwIXg71MMXe', false, 'Test');


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: user_menus; Type: TABLE DATA; Schema: public; Owner: admin
--

ALTER TABLE public.user_menus DISABLE TRIGGER ALL;

INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 3);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 4);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 5);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 6);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 8);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 7);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 1);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 2);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 6);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 2);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 9);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 10);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 11);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 12);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 13);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 14);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 15);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 15);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 7);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 3);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 17);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 18);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 17);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 20);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 19);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 20);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (2, 19);
INSERT INTO public.user_menus (user_id, menu_id) VALUES (1, 21);


ALTER TABLE public.user_menus ENABLE TRIGGER ALL;

--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.menus_id_seq', 21, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict ja5WTNBZPmcSpW593c8LGqfRBzkdrN4HkfpLUA3Lgn7KOaejOwSb8wkpOSxFssS

