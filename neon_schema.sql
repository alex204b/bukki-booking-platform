--
-- PostgreSQL database dump
--

\restrict ykmho4ExgiQo6ymx3wJIdw1xZ4njsK5lTK8PaNLjsmaGgK6U3TvlbL9CQNFPxhu

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: waitlist_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.waitlist_status_enum AS ENUM (
    'active',
    'notified',
    'booked',
    'cancelled'
);


ALTER TYPE public.waitlist_status_enum OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "appointmentDate" timestamp without time zone NOT NULL,
    "appointmentEndDate" timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    "paymentStatus" character varying(20) DEFAULT 'pending'::character varying,
    "totalAmount" numeric(10,2) NOT NULL,
    "customFieldValues" jsonb,
    notes text,
    "qrCode" text,
    "checkedInAt" timestamp without time zone,
    "cancelledAt" timestamp without time zone,
    "cancellationReason" character varying(255),
    "reminderSentAt" timestamp without time zone,
    "paymentDetails" jsonb,
    "customerId" uuid NOT NULL,
    "businessId" uuid NOT NULL,
    "serviceId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurrencePattern" character varying,
    "recurrenceEndDate" timestamp without time zone,
    "parentBookingId" character varying,
    "recurrenceSequence" integer,
    CONSTRAINT "bookings_paymentStatus_check" CHECK ((("paymentStatus")::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'no_show'::character varying])::text[])))
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: business_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "businessId" uuid NOT NULL,
    "userId" uuid,
    email character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'invited'::character varying,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    CONSTRAINT business_members_status_check CHECK (((status)::text = ANY ((ARRAY['invited'::character varying, 'active'::character varying, 'removed'::character varying])::text[])))
);


ALTER TABLE public.business_members OWNER TO postgres;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    "zipCode" character varying(20) NOT NULL,
    country character varying(100) NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone character varying(20) NOT NULL,
    email character varying(255),
    website character varying(255),
    logo character varying(500),
    images jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    "workingHours" jsonb,
    "customBookingFields" jsonb,
    "qrCode" text,
    rating numeric(3,2) DEFAULT 0,
    "reviewCount" integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "subscriptionPlan" character varying(50),
    "subscriptionExpiresAt" timestamp without time zone,
    "ownerId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    "showRevenue" boolean DEFAULT false,
    "autoAcceptBookings" boolean DEFAULT false,
    "maxBookingsPerUserPerDay" integer DEFAULT 2,
    "onboardingCompleted" boolean DEFAULT false,
    amenities jsonb DEFAULT '[]'::jsonb,
    "priceRange" character varying(20),
    CONSTRAINT businesses_category_check CHECK (((category)::text = ANY ((ARRAY['beauty_salon'::character varying, 'tailor'::character varying, 'mechanic'::character varying, 'restaurant'::character varying, 'fitness'::character varying, 'healthcare'::character varying, 'education'::character varying, 'consulting'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT businesses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: COLUMN businesses.amenities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.businesses.amenities IS 'Array of amenity codes like parking, wheelchair_accessible, wifi, outdoor_seating, air_conditioned';


--
-- Name: COLUMN businesses."priceRange"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.businesses."priceRange" IS 'Price range indicator: cheap, moderate, expensive, or NULL for unspecified';


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token character varying(500) NOT NULL,
    platform character varying(20) DEFAULT 'web'::character varying,
    "deviceId" character varying(255),
    "deviceName" character varying(255),
    "isActive" boolean DEFAULT true,
    "notificationPreferences" jsonb,
    "userId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    CONSTRAINT device_tokens_platform_check CHECK (((platform)::text = ANY ((ARRAY['web'::character varying, 'android'::character varying, 'ios'::character varying])::text[])))
);


ALTER TABLE public.device_tokens OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "recipientId" uuid NOT NULL,
    "businessId" uuid,
    "senderId" uuid,
    type character varying(20) NOT NULL,
    subject character varying(255) NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'unread'::character varying,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    "conversationId" character varying(255),
    "bookingId" character varying(36),
    CONSTRAINT messages_status_check CHECK (((status)::text = ANY ((ARRAY['unread'::character varying, 'read'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT messages_type_check CHECK (((type)::text = ANY ((ARRAY['team_invitation'::character varying, 'promotional_offer'::character varying])::text[])))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: offers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.offers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    "discountAmount" numeric(10,2),
    "discountPercentage" numeric(5,2),
    "discountCode" character varying(50),
    "validUntil" timestamp without time zone,
    "isActive" boolean DEFAULT true,
    metadata jsonb,
    "businessId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.offers OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "businessId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    rating integer NOT NULL,
    title character varying(255) NOT NULL,
    comment text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    duration integer DEFAULT 30,
    "isActive" boolean DEFAULT true,
    images jsonb,
    "customFields" jsonb,
    "maxBookingsPerSlot" integer DEFAULT 1,
    "advanceBookingDays" integer DEFAULT 0,
    "cancellationHours" integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    "reviewCount" integer DEFAULT 0,
    "bookingCount" integer DEFAULT 0,
    "businessId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(20) DEFAULT 'customer'::character varying,
    "isActive" boolean DEFAULT true,
    avatar character varying(500),
    address character varying(255),
    city character varying(100),
    state character varying(100),
    "zipCode" character varying(20),
    country character varying(100),
    "dateOfBirth" date,
    "emailVerified" boolean DEFAULT false,
    "emailVerificationToken" character varying(255),
    "passwordResetToken" character varying(255),
    "passwordResetExpires" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'business_owner'::character varying, 'employee'::character varying, 'super_admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    "preferredDate" timestamp without time zone,
    "notifiedAt" timestamp without time zone,
    "bookedAt" timestamp without time zone,
    notes character varying,
    "customerId" uuid NOT NULL,
    "businessId" uuid NOT NULL,
    "serviceId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.waitlist OWNER TO postgres;

--
-- Name: waitlist PK_waitlist; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT "PK_waitlist" PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: business_members business_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT business_members_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_businessId_userId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_businessId_userId_key" UNIQUE ("businessId", "userId");


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_BOOKING_IS_RECURRING; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_BOOKING_IS_RECURRING" ON public.bookings USING btree ("isRecurring");


--
-- Name: IDX_BOOKING_PARENT_ID; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_BOOKING_PARENT_ID" ON public.bookings USING btree ("parentBookingId");


--
-- Name: IDX_WAITLIST_BUSINESS; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_WAITLIST_BUSINESS" ON public.waitlist USING btree ("businessId");


--
-- Name: IDX_WAITLIST_CREATED_AT; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_WAITLIST_CREATED_AT" ON public.waitlist USING btree ("createdAt");


--
-- Name: IDX_WAITLIST_CUSTOMER; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_WAITLIST_CUSTOMER" ON public.waitlist USING btree ("customerId");


--
-- Name: IDX_WAITLIST_SERVICE; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_WAITLIST_SERVICE" ON public.waitlist USING btree ("serviceId");


--
-- Name: IDX_WAITLIST_STATUS; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_WAITLIST_STATUS" ON public.waitlist USING btree (status);


--
-- Name: IDX_messages_bookingId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_messages_bookingId" ON public.messages USING btree ("bookingId");


--
-- Name: IDX_messages_conversationId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_messages_conversationId" ON public.messages USING btree ("conversationId");


--
-- Name: IDX_messages_status_createdAt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_messages_status_createdAt" ON public.messages USING btree (status, "createdAt");


--
-- Name: IDX_messages_type_createdAt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_messages_type_createdAt" ON public.messages USING btree (type, "createdAt");


--
-- Name: idx_bookings_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_business ON public.bookings USING btree ("businessId");


--
-- Name: idx_bookings_business_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_business_date ON public.bookings USING btree ("businessId", "appointmentDate");


--
-- Name: idx_bookings_business_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_business_status ON public.bookings USING btree ("businessId", status);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_customer ON public.bookings USING btree ("customerId");


--
-- Name: idx_bookings_customer_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_customer_status ON public.bookings USING btree ("customerId", status);


--
-- Name: idx_bookings_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_date ON public.bookings USING btree ("appointmentDate");


--
-- Name: idx_bookings_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_parent ON public.bookings USING btree ("parentBookingId") WHERE ("parentBookingId" IS NOT NULL);


--
-- Name: idx_bookings_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_service ON public.bookings USING btree ("serviceId");


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_business_members_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_members_business ON public.business_members USING btree ("businessId");


--
-- Name: idx_business_members_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_members_email ON public.business_members USING btree (email);


--
-- Name: idx_business_members_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_members_status ON public.business_members USING btree (status);


--
-- Name: idx_business_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_members_user ON public.business_members USING btree ("userId");


--
-- Name: idx_businesses_active_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_active_status ON public.businesses USING btree ("isActive", status) WHERE (("isActive" = true) AND ((status)::text = 'approved'::text));


--
-- Name: idx_businesses_amenities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_amenities ON public.businesses USING gin (amenities);


--
-- Name: idx_businesses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_category ON public.businesses USING btree (category);


--
-- Name: idx_businesses_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_city ON public.businesses USING btree (city);


--
-- Name: idx_businesses_geolocation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_geolocation ON public.businesses USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_businesses_latitude; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_latitude ON public.businesses USING btree (latitude) WHERE (latitude IS NOT NULL);


--
-- Name: idx_businesses_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_location ON public.businesses USING btree (city, state);


--
-- Name: idx_businesses_longitude; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_longitude ON public.businesses USING btree (longitude) WHERE (longitude IS NOT NULL);


--
-- Name: idx_businesses_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_owner ON public.businesses USING btree ("ownerId");


--
-- Name: idx_businesses_price_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_price_range ON public.businesses USING btree ("priceRange");


--
-- Name: idx_businesses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_status ON public.businesses USING btree (status);


--
-- Name: idx_device_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_tokens_token ON public.device_tokens USING btree (token);


--
-- Name: idx_device_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_tokens_user ON public.device_tokens USING btree ("userId");


--
-- Name: idx_messages_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_business ON public.messages USING btree ("businessId");


--
-- Name: idx_messages_chat_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_conversation ON public.messages USING btree ("businessId", "senderId", "createdAt") WHERE ((type)::text = 'chat'::text);


--
-- Name: idx_messages_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_recipient ON public.messages USING btree ("recipientId");


--
-- Name: idx_messages_recipient_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_recipient_status ON public.messages USING btree ("recipientId", status);


--
-- Name: idx_messages_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_status ON public.messages USING btree (status);


--
-- Name: idx_messages_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_type ON public.messages USING btree (type);


--
-- Name: idx_offers_business_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_offers_business_active ON public.offers USING btree ("businessId", "isActive", "validUntil") WHERE ("isActive" = true);


--
-- Name: idx_offers_businessid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_offers_businessid ON public.offers USING btree ("businessId");


--
-- Name: idx_offers_isactive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_offers_isactive ON public.offers USING btree ("isActive");


--
-- Name: idx_offers_validuntil; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_offers_validuntil ON public.offers USING btree ("validUntil");


--
-- Name: idx_reviews_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_business_id ON public.reviews USING btree ("businessId");


--
-- Name: idx_reviews_business_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_business_rating ON public.reviews USING btree ("businessId", rating);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree ("createdAt");


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree ("userId");


--
-- Name: idx_services_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_business ON public.services USING btree ("businessId");


--
-- Name: idx_services_business_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_business_active ON public.services USING btree ("businessId", "isActive");


--
-- Name: idx_services_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_name ON public.services USING btree (name);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_waitlist_business_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_waitlist_business_active ON public.waitlist USING btree ("businessId", status) WHERE ((status)::text = 'active'::text);


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_members update_business_members_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_business_members_updated_at BEFORE UPDATE ON public.business_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: businesses update_businesses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services update_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: waitlist FK_waitlist_business; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT "FK_waitlist_business" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: waitlist FK_waitlist_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT "FK_waitlist_customer" FOREIGN KEY ("customerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: waitlist FK_waitlist_service; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT "FK_waitlist_service" FOREIGN KEY ("serviceId") REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: business_members business_members_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT "business_members_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_members business_members_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_members
    ADD CONSTRAINT "business_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: businesses businesses_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: messages messages_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: offers offers_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT "offers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: services services_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "services_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ykmho4ExgiQo6ymx3wJIdw1xZ4njsK5lTK8PaNLjsmaGgK6U3TvlbL9CQNFPxhu

