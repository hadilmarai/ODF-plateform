"""
Converted from Jupyter notebook: innovateuk.ipynb
This file contains all the code cells from the original notebook.

Generated automatically - do not edit manually.
Original notebook: innovateuk.ipynb
"""

# Fix encoding issues for Windows console when run through Node.js
import sys
import os
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# ============================================================================
# Cell 1 (execution_count: 1, id: 8012a7ca)
# ============================================================================

from selenium import webdriver
from utils.webdriver_manager import get_chrome_driver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Configurer le driver Chrome - now handled by webdriver_manager
# chrome_options = Options()
# chrome_options.add_argument("--headless")  # Run in headless mode for server execution
# chrome_options.add_argument("--disable-gpu")
# chrome_options.add_argument("--no-sandbox")
# chrome_options.add_argument("--disable-dev-shm-usage")
# chrome_options.add_argument("--window-size=1920,1080")

# service = Service(...) # Replaced by webdriver_manager
driver = get_chrome_driver(headless=True)
base_url = "https://www.ukri.org/opportunity/page/{}/"

with open("projets_UKRI_full.txt", "w", encoding="utf-8") as f:
    for page_num in range(1, 12):  # Pages 1 à 8
        url = base_url.format(page_num)
        driver.get(url)
        print(f"🌐 Chargement de la page {page_num}...")

        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.opportunity"))
            )
        except Exception:
            print(f"❌ Échec du chargement de la page {page_num}.")
            continue

        opportunities = driver.find_elements(By.CSS_SELECTOR, "div.opportunity")
        print(f"📄 {len(opportunities)} opportunités trouvées sur la page {page_num}.")

        for opp in opportunities:
            try:
                title_el = opp.find_element(By.CSS_SELECTOR, "h3.entry-title a")
                title = title_el.text.strip()
                link = title_el.get_attribute("href")

                try:
                    description = opp.find_element(By.CSS_SELECTOR, "div.entry-content p").text.strip()
                except:
                    description = "Description non trouvée"

                try:
                    opening_date = opp.find_element(By.XPATH, ".//dt[contains(text(), 'Opening date:')]/following-sibling::dd[1]/time").text.strip()
                except:
                    opening_date = "Date d'ouverture non spécifiée"

                try:
                    closing_date = opp.find_element(By.XPATH, ".//dt[contains(text(), 'Closing date:')]/following-sibling::dd[1]/time").text.strip()
                except:
                    closing_date = "Date de clôture non spécifiée"

                f.write(
                    f"Titre: {title}\n"
                    f"Lien: {link}\n"
                    f"Description: {description}\n"
                    f"Date d'ouverture: {opening_date}\n"
                    f"Date de clôture: {closing_date}\n\n"
                )
                print(f"✔ {title} | 📅 {opening_date} → {closing_date}")

            except Exception as e:
                print(f"⚠️ Erreur lors du traitement d'une opportunité : {e}")


driver.quit()



# ============================================================================
# Cell 2 (execution_count: 10, id: 3fff1955)
# ============================================================================

import pandas as pd

def parse_ukri_project_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    data = []
    current_project = {}

    for line in lines:
        if line.startswith("Titre:"):
            if current_project:
                data.append(current_project)
            current_project = {"Titre": line.split(":", 1)[1].strip()}
        elif line.startswith("Lien:"):
            current_project["Lien"] = line.split(":", 1)[1].strip()
        elif line.startswith("Description:"):
            current_project["Description"] = line.split(":", 1)[1].strip()
        elif line.startswith("Date d'ouverture:"):
            current_project["Date d'ouverture"] = line.split(":", 1)[1].strip()
        elif line.startswith("Date de clôture:"):
            current_project["Date de clôture"] = line.split(":", 1)[1].strip()

    if current_project:
        data.append(current_project)

    # Création du DataFrame avec renommage des colonnes en anglais
    df = pd.DataFrame(data)
    df.rename(columns={
        "Titre": "Title",
        "Lien": "URL",
        "Description": "Description",
        "Date d'ouverture": "Start_date",
        "Date de clôture": "Deadline"
    }, inplace=True)

    return df

# Utilisation
df = parse_ukri_project_file("projets_UKRI_full.txt")

# Aperçu
df.head()



# ============================================================================
# Cell 3 (execution_count: 11, id: bb1acac8)
# ============================================================================

pd.set_option('display.max_colwidth', None)
print(df['URL'])


# ============================================================================
# Cell 4 (execution_count: 12, id: 5d09c684)
# ============================================================================

# Dictionnaire de correspondance EN => FR
all_keywords_text = {
    "strategic consulting": "conseil stratégique",
    "technical assistance": "assistance technique",
    "institutional support": "appui institutionnel",
    "tailored support": "accompagnement personnalisé",
    "innovation support": "accompagnement à l’innovation",
    "fundraising support": "accompagnement à la levée de fonds",
    "organizational development": "développement organisationnel",
    "capacity building": "développement de capacités",
    "program structuring": "structuration de programme",
    "project design": "ingénierie de projet",
    "project management": "gestion de projet",
    "program steering": "pilotage de programme",
    "growth strategy": "stratégie de croissance",
    "sector expertise": "expertise sectorielle",
    "project evaluation": "évaluation de projets",
    "due diligence": "due diligence",
    "project implementation": "mise en œuvre de projet",
    "roadmap development": "élaboration de feuille de route",
    "financial engineering": "ingénierie financière",
    "strategic diagnosis": "diagnostic stratégique",
    "monitoring and evaluation": "suivi-évaluation",
    "operational action plan": "plan d’action opérationnel",
    "public-private partnership": "partenariat public-privé",
    "ecosystem animation": "animation d’écosystème",
    "impact analysis": "analyse d’impact",
    "partnership facilitation": "facilitation de partenariats",
    "stakeholder mapping": "cartographie des acteurs",
    "knowledge transfer": "transfert de compétences",
    "collaborative innovation": "innovation collaborative",
    "open innovation": "open innovation",
    "economic development": "développement économique",
    "ecosystem development": "développement d’écosystèmes",
    "expansion strategy": "stratégie d’expansion",
    "development strategy": "stratégie de développement",
    "research valorization": "valorisation de la recherche",
    "technology transfer": "transfert de technologie",
    "technology maturation": "maturation technologique",
    "prototype industrialization": "industrialisation de prototypes",
    "technological co-development": "co-développement technologique",
    "intellectual property": "propriété intellectuelle",
    "research results": "résultats de recherche",
    "technology readiness level": "niveau de maturité technologique",
    "university spin-off": "spin-off universitaire",
    "research-industry collaboration": "collaboration recherche-industrie",
    "technology startup": "start-up technologique",
    "technology portfolio": "portefeuille technologique",
    "innovation commercialization": "commercialisation d’innovations",
    "proof of concept": "preuve de concept",
    "prototyping": "prototypage",
    "technology incubator": "incubateur technologique",
    "R&D support": "accompagnement à la R&D",
    "patent exploitation": "exploitation de brevets",
    "call for projects": "appel à projets",
    "call for proposals": "appel à propositions",
    "call for expression of interest": "appel à manifestation d’intérêt",
    "call for applications": "appel à candidatures",
    "call for consultants": "appel à consultants",
    "innovation grant": "subvention à l’innovation",
    "R&D project funding": "financement de projet R&D",
    "support program": "programme d’accompagnement",
    "support fund": "fonds de soutien",
    "innovation competition": "concours d’innovation",
    "incubation program": "programme d’incubation",
    "acceleration program": "programme d’accélération",
    "consulting assignment": "mission de conseil",
    "public procurement": "marché public",
    "strategic partnership": "partenariat stratégique",
    "service delivery": "prestation de services",
    "expert mission": "mission d’expertise",
    "deeptech": "deeptech",
    "biotechnology": "biotechnologie",
    "medtech": "medtech",
    "greentech": "greentech",
    "agritech": "agritech",
    "climatetech": "climatetech",
    "healthtech": "healthtech",
    "nanotechnology": "nanotechnologie",
    "robotics": "robotique",
    "artificial intelligence": "intelligence artificielle",
    "machine learning": "machine learning",
    "industry 4.0": "industrie 4.0",
    "advanced materials": "matériaux avancés",
    "clean technologies": "technologies propres",
    "renewable energy": "énergies renouvelables",
    "cybersecurity": "cybersécurité",
    "data science": "data science",
    "internet of things": "internet des objets",
    "sustainable development": "développement durable",
    "climate resilience": "résilience climatique",
    "economic inclusion": "inclusion économique",
    "empowerment through innovation": "autonomisation par l’innovation",
    "social innovation": "innovation sociale",
    "inclusive growth": "croissance inclusive",
    "social impact": "impact sociétal",
    "youth empowerment": "autonomisation des jeunes",
    "services digitalization": "digitalisation des services",
    "technological sovereignty": "souveraineté technologique",
    "territorial development": "développement territorial",
    "digital transformation": "transformation numérique",
    "researcher empowerment": "autonomisation des chercheurs",
    "diaspora integration": "intégration de la diaspora",
    "cross-sector collaboration": "collaboration intersectorielle",
    "industrial partnerships": "partenariats industriels",
    "market-driven innovation": "innovation orientée marché",
    "innovative SMEs": "PME innovantes",
    "industrial entrepreneurship": "entrepreneuriat industriel",
    "market access": "accès au marché",
    "value chain strengthening": "renforcement des chaînes de valeur",
    "economic impact": "impact économique",
    "economic empowerment": "autonomisation économique",
    "industrial competitiveness": "compétitivité industrielle",
    "applied research": "recherche appliquée",
    "skills development": "montée en compétences",
    "know-how transfer": "transfert de savoir-faire",
    "co-development": "co-développement",
    "technology leadership": "leadership technologique"
}



# ============================================================================
# Cell 5 (execution_count: 21, id: df003a75)
# ============================================================================

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import pandas as pd
from tqdm import tqdm


# === Configure headless browser ===
# # options = Options()
# options.add_argument("--headless")
# options.add_argument("--disable-gpu")
# options.add_argument("--window-size=1920,1080")

driver = get_chrome_driver(headless=True)

# === Initialize results ===
pertinence_list = []
keywords_list = []

# === Loop through all project URLs ===
for url in tqdm(df["URL"], desc="Checking each project..."):
    try:
        driver.get(url)
        time.sleep(3)

        # Try to open all accordion sections if present
        try:
            open_all_btn = driver.find_element(By.CLASS_NAME, "govuk-accordion__open-all")
            open_all_btn.click()
            time.sleep(1)
        except:
            pass  # No button or already opened

        # Try to find the accordion text
        try:
            accordion_div = driver.find_element(By.CSS_SELECTOR, ".govuk-accordion.ukri-accordion")
            accordion_text = accordion_div.text
        except:
            accordion_text = ""

        matched_keywords = [kw for kw in all_keywords_text if kw.lower() in accordion_text.lower()]
        pertinence = "Yes" if matched_keywords else "No"

    except Exception as e:
        print(f"Error with URL: {url} — {e}")
        matched_keywords = []
        pertinence = "No"

    # Store results
    pertinence_list.append(pertinence)
    keywords_list.append(", ".join(matched_keywords))

# === Add results to DataFrame ===
df["Pertinence"] = pertinence_list
df["Matching Word(s)"] = keywords_list

# === Save to Excel ===
df.to_excel("projets_UKRI_with_keywords.xlsx", index=False)
print("✅ Results saved to projets_UKRI_with_keywords.xlsx")

# === Close browser ===
driver.quit()



# ============================================================================
# Cell 6 (execution_count: 22, id: ff38feea)
# ============================================================================

df


# ============================================================================
# Cell 7 (execution_count: 28, id: fd5866fc)
# ============================================================================

df_pertinence_uk= df[df["Pertinence"] == "Yes"]
df_pertinence_uk


# ============================================================================
# Cell 8 (execution_count: 29, id: 2531e784)
# ============================================================================

df_pertinence_uk.to_excel("projets_pertinents_keywords_InnUK_from_all_description.xlsx", index=False)


# ============================================================================
# Cell 9 (execution_count: 30, id: bfa7c194)
# ============================================================================

import pandas as pd

# Données extraites
data = [
    {
        "Project Name": "FACTORIAT",
        "Description": "Support Deeptech & Hardware startups in prototyping and tech maturation with technical and financial help.",
        "Period": "2022–2023",
        "Axes / Thematic Areas": "Deeptech, Hardware, Incubation, Prototyping, Acceleration",
        "Region": "Tunisia",
        "Partners / Funders": "Industrial partners, ODF network",
        "Key Figures / Impact": "7 prototypes, 4 pre-industrial units"
    },
    {
        "Project Name": "National Entrepreneurship Program",
        "Description": "Design and implementation of Lesotho's national entrepreneurship ecosystem.",
        "Period": "2022–2025",
        "Axes / Thematic Areas": "Capacity building, Strategy, Startup Ecosystem",
        "Region": "Lesotho",
        "Partners / Funders": "Local government, ODF",
        "Key Figures / Impact": "500 entrepreneurs, 15 ESOs supported"
    },
    {
        "Project Name": "Arab Bank Strategy",
        "Description": "Develop funding & partnership strategy for African digital economy projects.",
        "Period": "N/A",
        "Axes / Thematic Areas": "Digital Economy, Strategic Development, Financing",
        "Region": "Sub-Saharan Africa",
        "Partners / Funders": "Arab Bank for Economic Development in Africa",
        "Key Figures / Impact": "Strategy developed"
    },
    {
        "Project Name": "World Bank Collaboration",
        "Description": "Develop startup ecosystem in 5 Southern African countries including Lesotho.",
        "Period": "2020–2022",
        "Axes / Thematic Areas": "Startup Ecosystem, Digital Economy, Entrepreneurship",
        "Region": "Southern Africa",
        "Partners / Funders": "World Bank",
        "Key Figures / Impact": "SA, Lesotho, Namibia, Botswana, Eswatini"
    },
    {
        "Project Name": "MDBAN – Business Angels Network",
        "Description": "Support early-stage Maghreb startups via diaspora angel investment.",
        "Period": "2021–Present",
        "Axes / Thematic Areas": "Startup Support, Investment, Diaspora Engagement",
        "Region": "MENA, Diaspora",
        "Partners / Funders": "MDBAN, ODF",
        "Key Figures / Impact": "56 startups financed, 33 angels"
    },
    {
        "Project Name": "BIATLABS",
        "Description": "Incubation program by BIAT Bank, run by ODF.",
        "Period": "2016–2018",
        "Axes / Thematic Areas": "Startup Incubation, Early-Stage Innovation",
        "Region": "Tunisia",
        "Partners / Funders": "BIAT (Private Bank)",
        "Key Figures / Impact": "4 cohorts, 45 startups, 15 labeled, 6 funded"
    },
    {
        "Project Name": "TECHNORIAT PPP Program",
        "Description": "Bridge research & entrepreneurship via incubation/acceleration of researchers.",
        "Period": "2021–2023",
        "Axes / Thematic Areas": "Scientific Research, Deeptech, Acceleration, Entrepreneurship",
        "Region": "Tunisia",
        "Partners / Funders": "TECHNORIAT, PPP",
        "Key Figures / Impact": "800 sensitized, 136 preselected, 13 incubated, 8 accelerated"
    },
    {
        "Project Name": "ABI – Applied Biotech & Innovation",
        "Description": "Turn biotech discoveries into marketable solutions with IP licensing model.",
        "Period": "N/A",
        "Axes / Thematic Areas": "Biotech, One Health, IP Licensing, Innovation",
        "Region": "N/A",
        "Partners / Funders": "ODF internal program",
        "Key Figures / Impact": "IP Model: License IN → Maturation → License OUT"
    }
]

# Création du DataFrame
odf_df = pd.DataFrame(data)




# ============================================================================
# Cell 10 (execution_count: None, id: e30f0df5)
# ============================================================================

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import pandas as pd
from groq import Groq
import re
from tqdm import tqdm

# === CONFIGURATION GROQ ===
client = Groq(api_key="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")
MODEL_NAME = "llama3-70b-8192"

# === CONFIGURATION SELENIUM HEADLESS ===
# # options = Options()
# options.add_argument("--headless")
# options.add_argument("--disable-gpu")
# options.add_argument("--window-size=1920,1080")
driver = get_chrome_driver(headless=True)

# === Nettoyage & Limitation texte ===
def clean_and_limit_text(text, max_words=800):
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    if len(words) > max_words:
        return ' '.join(words[:max_words]) + " [...] (texte tronqué)"
    return text

# === Extraction texte depuis une URL ===
def extract_text_from_URL(URL):
    try:
        driver.get(URL)
        time.sleep(5)

        for _ in range(10):
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(0.3)
        time.sleep(3)

        js_desc = """
        let desc = document.querySelector('div.showMore--three-lines');
        return desc ? desc.innerText.trim() : '';
        """
        description_text = driver.execute_script(js_desc)

        try:
            open_all_btn = driver.find_element(By.CLASS_NAME, "govuk-accordion__open-all")
            open_all_btn.click()
            time.sleep(1)
        except:
            pass

        js_accordion = """
        let acc = document.querySelector('div.govuk-accordion.ukri-accordion');
        return acc ? acc.innerText.trim() : '';
        """
        accordion_text = driver.execute_script(js_accordion)

        final_text = f"{description_text}\n\n---\n\n{accordion_text}".strip()
        return final_text if final_text.strip() else "Pas de contenu détecté."
    
    except Exception as e:
        return f"Erreur Selenium: {e}"

# === Construction du prompt pour Groq ===
def build_prompt(projects, site_text):
    projects_text = "\n".join([
        f"{i+1}. {p['Project Name']} : {p['Description']} (axe {p['Axes / Thematic Areas']})"
        for i, p in enumerate(projects)
    ])
    return f"""
Tu es un expert en analyse de projets d'entreprise.

Voici une liste de projets que cette entreprise a déjà réalisés avec leurs descriptions et axes principaux :

{projects_text}

Voici maintenant le contenu d'un appel à projets extrait d'une page du portail européen :

{site_text}

Peux-tu me dire si cette opportunité est pertinente par rapport aux projets que l'entreprise a déjà réalisés ?
Merci de répondre clairement :
- Pertinence : Oui / Non
- Projets similaires détectés : [liste]
- Résumé rapide expliquant ta réponse.
"""

# === Requête Groq ===
def query_groq(prompt, model=MODEL_NAME, max_tokens=6000, temperature=1.0, stream=False, delay_between_requests=10):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Tu es un expert en comparaison de projets R&D."},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=1,
            stream=stream
        )
        if stream:
            result = ""
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    result += delta
            time.sleep(delay_between_requests)
            return result.strip()
        else:
            time.sleep(delay_between_requests)
            return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Erreur Groq: {e}"

# === Parsing du résultat Groq ===
def parse_result(text):
    pertinence = "Non"
    resume = ""

    try:
        match = re.search(r"(?i)pertinence\s*[:\-–]\s*(oui|non)", text)
        if match:
            pertinence = match.group(1).capitalize()

        resume_match = re.search(r"(?i)résumé.*?:\s*(.+)", text)
        if resume_match:
            resume = resume_match.group(1).strip()
        else:
            resume = "\n".join(text.splitlines()[1:4]).strip()
    except:
        pass

    return pertinence, resume

# === Analyse d'une URL ===
def analyze_URL(URL, projects_list):
    print(f"🟡 Analyse en cours : {URL}")
    try:
        site_text_raw = extract_text_from_URL(URL)
        site_text = clean_and_limit_text(site_text_raw, max_words=800)
        projects_list_sample = projects_list[:3]  # 3 projets max

        prompt = build_prompt(projects_list_sample, site_text)
        result_text = query_groq(prompt)
        pertinence, resume = parse_result(result_text)
        
        return {
            "URL": URL,
            "Pertinence LLM": pertinence,
            "Résumé LLM": resume,
            "Réponse brute": result_text
        }
    except Exception as e:
        return {
            "URL": URL,
            "Pertinence LLM": "Erreur",
            "Résumé LLM": f"Erreur pendant l'analyse : {e}",
            "Réponse brute": str(e)
        }

# === MAIN EXECUTION ===
if __name__ == "__main__":
    try:
        df_pertinence_uk = pd.read_excel("projets_pertinents_keywords_InnUK_from_all_description.xlsx")
        projects_list = odf_df[['Project Name', 'Description', 'Axes / Thematic Areas']].dropna().to_dict(orient='records')
        URL_list = df_pertinence_uk['URL'].dropna().unique()

        results = []
        for URL in tqdm(URL_list, desc="🔍 Analyse des URLs"):
            results.append(analyze_URL(URL, projects_list))

        results_df = pd.DataFrame(results)
        df_final_llm_uk = df_pertinence_uk.merge(results_df, on="URL", how="left")

       
    finally:
        driver.quit()





# ============================================================================
# Cell 11 (execution_count: 34, id: 35002837)
# ============================================================================

# Save to Excel
df_final_llm_uk.to_excel('df_final_ukllm.xlsx', index=False, engine='openpyxl')

