


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."compra_estado" AS ENUM (
    'borrador',
    'recibida',
    'pagada',
    'cancelada'
);


ALTER TYPE "public"."compra_estado" OWNER TO "postgres";


CREATE TYPE "public"."movimiento_tipo" AS ENUM (
    'ingreso',
    'egreso'
);


ALTER TYPE "public"."movimiento_tipo" OWNER TO "postgres";


CREATE TYPE "public"."pago_metodo" AS ENUM (
    'efectivo',
    'transferencia',
    'tarjeta_debito',
    'tarjeta_credito',
    'cheque',
    'credito_cliente'
);


ALTER TYPE "public"."pago_metodo" OWNER TO "postgres";


CREATE TYPE "public"."user_rol" AS ENUM (
    'admin',
    'vendedor',
    'cajero',
    'visor'
);


ALTER TYPE "public"."user_rol" OWNER TO "postgres";


CREATE TYPE "public"."venta_estado" AS ENUM (
    'presupuesto',
    'confirmado',
    'en_preparacion',
    'entregado',
    'facturado',
    'cobrado',
    'cancelado'
);


ALTER TYPE "public"."venta_estado" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mi_rol"() RETURNS "public"."user_rol"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."mi_rol"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_saldo_compra"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_compra_id      UUID;
  v_total          NUMERIC;
  v_total_imputado NUMERIC;
BEGIN
  v_compra_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.compra_id ELSE NEW.compra_id END;
  SELECT total INTO v_total FROM compras WHERE id = v_compra_id;
  SELECT COALESCE(SUM(monto), 0) INTO v_total_imputado
    FROM pago_proveedor_imputaciones WHERE compra_id = v_compra_id;
  UPDATE compras SET
    saldo_pendiente = GREATEST(total - v_total_imputado, 0),
    estado = CASE
      WHEN (total - v_total_imputado) <= 0 AND estado != 'cancelada' THEN 'pagada'
      WHEN estado = 'pagada' AND (total - v_total_imputado) > 0 THEN 'recibida'
      ELSE estado END
  WHERE id = v_compra_id;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."recalcular_saldo_compra"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_saldo_venta"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_venta_id       UUID;
  v_total          NUMERIC;
  v_total_imputado NUMERIC;
BEGIN
  v_venta_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.venta_id ELSE NEW.venta_id END;
  SELECT total INTO v_total FROM ventas WHERE id = v_venta_id;
  SELECT COALESCE(SUM(monto), 0) INTO v_total_imputado FROM pago_imputaciones WHERE venta_id = v_venta_id;
  UPDATE ventas SET
    saldo_pendiente = GREATEST(total - v_total_imputado, 0),
    estado = CASE
      WHEN (total - v_total_imputado) <= 0 AND estado != 'cancelado' THEN 'cobrado'
      WHEN estado = 'cobrado' AND (total - v_total_imputado) > 0 THEN 'entregado'
      ELSE estado END
  WHERE id = v_venta_id;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."recalcular_saldo_venta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."caja_movimientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "caja_sesion_id" "uuid" NOT NULL,
    "tipo" "public"."movimiento_tipo" NOT NULL,
    "metodo" "public"."pago_metodo" DEFAULT 'efectivo'::"public"."pago_metodo" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "descripcion" "text" NOT NULL,
    "pago_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pago_proveedor_id" "uuid",
    CONSTRAINT "caja_movimientos_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."caja_movimientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."caja_sesiones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cajero_id" "uuid",
    "apertura_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cierre_at" timestamp with time zone,
    "monto_apertura" numeric(12,2) DEFAULT 0 NOT NULL,
    "monto_cierre_real" numeric(12,2),
    "monto_cierre_sistema" numeric(12,2),
    "diferencia" numeric(12,2),
    "estado" "text" DEFAULT 'abierta'::"text" NOT NULL,
    "notas" "text",
    CONSTRAINT "caja_estado_check" CHECK (("estado" = ANY (ARRAY['abierta'::"text", 'cerrada'::"text"])))
);


ALTER TABLE "public"."caja_sesiones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razon_social" "text" NOT NULL,
    "nombre_fantasia" "text",
    "cuit" "text",
    "email" "text",
    "telefono" "text",
    "direccion" "text",
    "localidad" "text",
    "limite_credito" numeric(12,2) DEFAULT 0 NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compra_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "compra_id" "uuid" NOT NULL,
    "producto_id" "uuid",
    "descripcion" "text" NOT NULL,
    "cantidad" numeric(12,3) NOT NULL,
    "precio_unitario" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compra_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."compras_numero_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."compras_numero_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero" integer DEFAULT "nextval"('"public"."compras_numero_seq"'::"regclass") NOT NULL,
    "proveedor_id" "uuid" NOT NULL,
    "receptor_id" "uuid",
    "estado" "public"."compra_estado" DEFAULT 'borrador'::"public"."compra_estado" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "fecha_vencimiento" "date",
    "numero_factura" "text",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "saldo_pendiente" numeric(12,2) DEFAULT 0 NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movimientos_extra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "public"."movimiento_tipo" NOT NULL,
    "categoria" "text",
    "monto" numeric(12,2) NOT NULL,
    "descripcion" "text" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "caja_sesion_id" "uuid",
    "comprobante" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "movimientos_extra_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."movimientos_extra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pago_imputaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pago_id" "uuid" NOT NULL,
    "venta_id" "uuid" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pago_imputaciones_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."pago_imputaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pago_proveedor_imputaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pago_id" "uuid" NOT NULL,
    "compra_id" "uuid" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pago_proveedor_imputaciones_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."pago_proveedor_imputaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "caja_sesion_id" "uuid",
    "metodo" "public"."pago_metodo" DEFAULT 'efectivo'::"public"."pago_metodo" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "referencia" "text",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pagos_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagos_proveedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proveedor_id" "uuid" NOT NULL,
    "caja_sesion_id" "uuid",
    "metodo" "public"."pago_metodo" DEFAULT 'efectivo'::"public"."pago_metodo" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "referencia" "text",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pagos_proveedores_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."pagos_proveedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text",
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "precio" numeric(12,2) DEFAULT 0 NOT NULL,
    "costo" numeric(12,2) DEFAULT 0 NOT NULL,
    "stock" numeric(12,3) DEFAULT 0 NOT NULL,
    "unidad" "text" DEFAULT 'unidad'::"text" NOT NULL,
    "es_servicio" boolean DEFAULT false NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "email" "text" NOT NULL,
    "rol" "public"."user_rol" DEFAULT 'vendedor'::"public"."user_rol" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proveedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razon_social" "text" NOT NULL,
    "nombre_fantasia" "text",
    "cuit" "text",
    "email" "text",
    "telefono" "text",
    "direccion" "text",
    "localidad" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."proveedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venta_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venta_id" "uuid" NOT NULL,
    "producto_id" "uuid",
    "descripcion" "text" NOT NULL,
    "cantidad" numeric(12,3) NOT NULL,
    "precio_unitario" numeric(12,2) NOT NULL,
    "descuento" numeric(12,2) DEFAULT 0 NOT NULL,
    "subtotal" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."venta_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ventas_numero_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ventas_numero_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ventas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero" integer DEFAULT "nextval"('"public"."ventas_numero_seq"'::"regclass") NOT NULL,
    "cliente_id" "uuid",
    "vendedor_id" "uuid",
    "estado" "public"."venta_estado" DEFAULT 'presupuesto'::"public"."venta_estado" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "fecha_entrega" "date",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "descuento" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "saldo_pendiente" numeric(12,2) DEFAULT 0 NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ventas" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_caja_detalle" AS
 SELECT "cs"."id" AS "sesion_id",
    "cs"."cajero_id",
    "cs"."apertura_at",
    "cs"."cierre_at",
    "cs"."estado" AS "sesion_estado",
    "cs"."monto_apertura",
    "cm"."id" AS "movimiento_id",
    "cm"."tipo",
    "cm"."metodo",
    "cm"."monto",
    "cm"."descripcion",
    "cm"."created_at" AS "movimiento_at"
   FROM ("public"."caja_sesiones" "cs"
     LEFT JOIN "public"."caja_movimientos" "cm" ON (("cm"."caja_sesion_id" = "cs"."id")));


ALTER VIEW "public"."vista_caja_detalle" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_cuenta_corriente" AS
 SELECT "c"."id",
    "c"."razon_social",
    "c"."nombre_fantasia",
    "c"."limite_credito",
    COALESCE("v"."total_ventas", (0)::numeric) AS "total_facturado",
    COALESCE("p"."total_pagado", (0)::numeric) AS "total_pagado",
    (COALESCE("v"."total_ventas", (0)::numeric) - COALESCE("p"."total_pagado", (0)::numeric)) AS "saldo_deudor",
    ("c"."limite_credito" - (COALESCE("v"."total_ventas", (0)::numeric) - COALESCE("p"."total_pagado", (0)::numeric))) AS "credito_disponible"
   FROM (("public"."clientes" "c"
     LEFT JOIN ( SELECT "ventas"."cliente_id",
            "sum"("ventas"."total") AS "total_ventas"
           FROM "public"."ventas"
          WHERE ("ventas"."estado" <> ALL (ARRAY['presupuesto'::"public"."venta_estado", 'cancelado'::"public"."venta_estado"]))
          GROUP BY "ventas"."cliente_id") "v" ON (("v"."cliente_id" = "c"."id")))
     LEFT JOIN ( SELECT "pagos"."cliente_id",
            "sum"("pagos"."monto") AS "total_pagado"
           FROM "public"."pagos"
          GROUP BY "pagos"."cliente_id") "p" ON (("p"."cliente_id" = "c"."id")));


ALTER VIEW "public"."vista_cuenta_corriente" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_cuenta_corriente_proveedores" AS
 SELECT "p"."id",
    "p"."razon_social",
    "p"."nombre_fantasia",
    COALESCE("c"."total_compras", (0)::numeric) AS "total_facturado",
    COALESCE("pg"."total_pagado", (0)::numeric) AS "total_pagado",
    (COALESCE("c"."total_compras", (0)::numeric) - COALESCE("pg"."total_pagado", (0)::numeric)) AS "saldo_deudor"
   FROM (("public"."proveedores" "p"
     LEFT JOIN ( SELECT "compras"."proveedor_id",
            "sum"("compras"."total") AS "total_compras"
           FROM "public"."compras"
          WHERE ("compras"."estado" <> ALL (ARRAY['borrador'::"public"."compra_estado", 'cancelada'::"public"."compra_estado"]))
          GROUP BY "compras"."proveedor_id") "c" ON (("c"."proveedor_id" = "p"."id")))
     LEFT JOIN ( SELECT "pagos_proveedores"."proveedor_id",
            "sum"("pagos_proveedores"."monto") AS "total_pagado"
           FROM "public"."pagos_proveedores"
          GROUP BY "pagos_proveedores"."proveedor_id") "pg" ON (("pg"."proveedor_id" = "p"."id")));


ALTER VIEW "public"."vista_cuenta_corriente_proveedores" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_ventas_resumen" AS
 SELECT "estado",
    "count"(*) AS "cantidad",
    "sum"("total") AS "monto_total",
    "sum"("saldo_pendiente") AS "saldo_pendiente_total"
   FROM "public"."ventas"
  GROUP BY "estado";


ALTER VIEW "public"."vista_ventas_resumen" OWNER TO "postgres";


ALTER TABLE ONLY "public"."caja_movimientos"
    ADD CONSTRAINT "caja_movimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caja_sesiones"
    ADD CONSTRAINT "caja_sesiones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compra_items"
    ADD CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compras"
    ADD CONSTRAINT "compras_numero_key" UNIQUE ("numero");



ALTER TABLE ONLY "public"."compras"
    ADD CONSTRAINT "compras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimientos_extra"
    ADD CONSTRAINT "movimientos_extra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pago_imputaciones"
    ADD CONSTRAINT "pago_imputaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pago_proveedor_imputaciones"
    ADD CONSTRAINT "pago_proveedor_imputaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos_proveedores"
    ADD CONSTRAINT "pagos_proveedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venta_items"
    ADD CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_numero_key" UNIQUE ("numero");



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "trg_clientes_updated_at" BEFORE UPDATE ON "public"."clientes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_compras_updated_at" BEFORE UPDATE ON "public"."compras" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pago_imputacion_cambio" AFTER INSERT OR DELETE OR UPDATE ON "public"."pago_imputaciones" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_saldo_venta"();



CREATE OR REPLACE TRIGGER "trg_pago_proveedor_imputacion_cambio" AFTER INSERT OR DELETE OR UPDATE ON "public"."pago_proveedor_imputaciones" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_saldo_compra"();



CREATE OR REPLACE TRIGGER "trg_productos_updated_at" BEFORE UPDATE ON "public"."productos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_proveedores_updated_at" BEFORE UPDATE ON "public"."proveedores" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ventas_updated_at" BEFORE UPDATE ON "public"."ventas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."caja_movimientos"
    ADD CONSTRAINT "caja_movimientos_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "public"."caja_sesiones"("id");



ALTER TABLE ONLY "public"."caja_movimientos"
    ADD CONSTRAINT "caja_movimientos_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id");



ALTER TABLE ONLY "public"."caja_movimientos"
    ADD CONSTRAINT "caja_movimientos_pago_proveedor_id_fkey" FOREIGN KEY ("pago_proveedor_id") REFERENCES "public"."pagos_proveedores"("id");



ALTER TABLE ONLY "public"."caja_sesiones"
    ADD CONSTRAINT "caja_sesiones_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."compra_items"
    ADD CONSTRAINT "compra_items_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compra_items"
    ADD CONSTRAINT "compra_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."compras"
    ADD CONSTRAINT "compras_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id");



ALTER TABLE ONLY "public"."compras"
    ADD CONSTRAINT "compras_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."movimientos_extra"
    ADD CONSTRAINT "movimientos_extra_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "public"."caja_sesiones"("id");



ALTER TABLE ONLY "public"."pago_imputaciones"
    ADD CONSTRAINT "pago_imputaciones_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pago_imputaciones"
    ADD CONSTRAINT "pago_imputaciones_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id");



ALTER TABLE ONLY "public"."pago_proveedor_imputaciones"
    ADD CONSTRAINT "pago_proveedor_imputaciones_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id");



ALTER TABLE ONLY "public"."pago_proveedor_imputaciones"
    ADD CONSTRAINT "pago_proveedor_imputaciones_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos_proveedores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "public"."caja_sesiones"("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."pagos_proveedores"
    ADD CONSTRAINT "pagos_proveedores_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "public"."caja_sesiones"("id");



ALTER TABLE ONLY "public"."pagos_proveedores"
    ADD CONSTRAINT "pagos_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venta_items"
    ADD CONSTRAINT "venta_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."venta_items"
    ADD CONSTRAINT "venta_items_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."caja_movimientos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."caja_sesiones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compra_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compras" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "editar perfil" ON "public"."profiles" FOR UPDATE USING ((("id" = "auth"."uid"()) OR ("public"."mi_rol"() = 'admin'::"public"."user_rol")));



CREATE POLICY "escritura" ON "public"."caja_movimientos" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."caja_sesiones" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."clientes" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."compra_items" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."compras" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."movimientos_extra" USING (("public"."mi_rol"() = 'admin'::"public"."user_rol"));



CREATE POLICY "escritura" ON "public"."pago_imputaciones" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."pago_proveedor_imputaciones" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."pagos" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."pagos_proveedores" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'cajero'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."productos" USING (("public"."mi_rol"() = 'admin'::"public"."user_rol"));



CREATE POLICY "escritura" ON "public"."proveedores" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."venta_items" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "escritura" ON "public"."ventas" USING (("public"."mi_rol"() = ANY (ARRAY['admin'::"public"."user_rol", 'vendedor'::"public"."user_rol"])));



CREATE POLICY "lectura" ON "public"."caja_movimientos" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."caja_sesiones" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."clientes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."compra_items" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."compras" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."movimientos_extra" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."pago_imputaciones" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."pago_proveedor_imputaciones" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."pagos" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."pagos_proveedores" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."productos" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."proveedores" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."venta_items" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "lectura" ON "public"."ventas" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."movimientos_extra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pago_imputaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pago_proveedor_imputaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos_proveedores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proveedores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trigger inserta perfil" ON "public"."profiles" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."venta_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ventas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ver perfil" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("public"."mi_rol"() = 'admin'::"public"."user_rol")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mi_rol"() TO "anon";
GRANT ALL ON FUNCTION "public"."mi_rol"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mi_rol"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_saldo_compra"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_saldo_compra"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_saldo_compra"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_saldo_venta"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_saldo_venta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_saldo_venta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."caja_movimientos" TO "anon";
GRANT ALL ON TABLE "public"."caja_movimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."caja_movimientos" TO "service_role";



GRANT ALL ON TABLE "public"."caja_sesiones" TO "anon";
GRANT ALL ON TABLE "public"."caja_sesiones" TO "authenticated";
GRANT ALL ON TABLE "public"."caja_sesiones" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."compra_items" TO "anon";
GRANT ALL ON TABLE "public"."compra_items" TO "authenticated";
GRANT ALL ON TABLE "public"."compra_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."compras_numero_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."compras_numero_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."compras_numero_seq" TO "service_role";



GRANT ALL ON TABLE "public"."compras" TO "anon";
GRANT ALL ON TABLE "public"."compras" TO "authenticated";
GRANT ALL ON TABLE "public"."compras" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos_extra" TO "anon";
GRANT ALL ON TABLE "public"."movimientos_extra" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos_extra" TO "service_role";



GRANT ALL ON TABLE "public"."pago_imputaciones" TO "anon";
GRANT ALL ON TABLE "public"."pago_imputaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."pago_imputaciones" TO "service_role";



GRANT ALL ON TABLE "public"."pago_proveedor_imputaciones" TO "anon";
GRANT ALL ON TABLE "public"."pago_proveedor_imputaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."pago_proveedor_imputaciones" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON TABLE "public"."pagos_proveedores" TO "anon";
GRANT ALL ON TABLE "public"."pagos_proveedores" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos_proveedores" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."proveedores" TO "anon";
GRANT ALL ON TABLE "public"."proveedores" TO "authenticated";
GRANT ALL ON TABLE "public"."proveedores" TO "service_role";



GRANT ALL ON TABLE "public"."venta_items" TO "anon";
GRANT ALL ON TABLE "public"."venta_items" TO "authenticated";
GRANT ALL ON TABLE "public"."venta_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ventas_numero_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ventas_numero_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ventas_numero_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ventas" TO "anon";
GRANT ALL ON TABLE "public"."ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."ventas" TO "service_role";



GRANT ALL ON TABLE "public"."vista_caja_detalle" TO "anon";
GRANT ALL ON TABLE "public"."vista_caja_detalle" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_caja_detalle" TO "service_role";



GRANT ALL ON TABLE "public"."vista_cuenta_corriente" TO "anon";
GRANT ALL ON TABLE "public"."vista_cuenta_corriente" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_cuenta_corriente" TO "service_role";



GRANT ALL ON TABLE "public"."vista_cuenta_corriente_proveedores" TO "anon";
GRANT ALL ON TABLE "public"."vista_cuenta_corriente_proveedores" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_cuenta_corriente_proveedores" TO "service_role";



GRANT ALL ON TABLE "public"."vista_ventas_resumen" TO "anon";
GRANT ALL ON TABLE "public"."vista_ventas_resumen" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_ventas_resumen" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







