"""
Converted from Jupyter notebook: LLMODF.ipynb
This file contains all the code cells from the original notebook.

Generated automatically - do not edit manually.
Original notebook: LLMODF.ipynb
"""

# Fix encoding issues for Windows console when run through Node.js
import sys
import os
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# ============================================================================
# Cell 1 (execution_count: 17, id: dcdd3adb)
# ============================================================================

from selenium import webdriver
from utils.webdriver_manager import get_chrome_driver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Chrome options are now handled by webdriver_manager
# chrome_options = Options()
# chrome_options.add_argument("--headless")  # Run in headless mode for server execution
# chrome_options.add_argument("--disable-gpu")
# chrome_options.add_argument("--no-sandbox")
# chrome_options.add_argument("--disable-dev-shm-usage")
# chrome_options.add_argument("--window-size=1920,1080")

# service = Service(...) # Replaced by webdriver_manager
driver = get_chrome_driver(headless=True)

start_url = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?pageNumber=1&pageSize=50&sortBy=startDate&status=31094501,31094502"
driver.get(start_url)

with open("projets_EU_All.txt", "w", encoding="utf-8") as f:
    for page_num in range(1, 9):  # Pages 1 to 50
        try:
            WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "a.cft-call-list-table-title-link, a[href*='topic-details'], a[href*='competitive-calls-cs']"))
            )
        except Exception:
            print(f"❌ Aucun projet trouvé sur la page {page_num}.")
            break

        time.sleep(2)
        
        project_links = driver.find_elements(
            By.CSS_SELECTOR,
            "a.cft-call-list-table-title-link, a[href*='topic-details'], a[href*='competitive-calls-cs']"
        )

        print(f"📄 Page {page_num} : {len(project_links)} projets trouvés.")

        for link in project_links:
            titre = link.text.strip()
            href = link.get_attribute("href")

            try:
                container = link.find_element(By.XPATH, "./ancestor::eui-card")
            except:
                container = None

            # --- Main Status ---
            try:
                status_element = container.find_element(
                    By.CSS_SELECTOR, "span.eui-u-text-nowrap.eui-label"
                )
                status = status_element.text.strip()
            except:
                status = "Statut inconnu"

            # --- Dates and Additional Status ---
            opening_date = "Non spécifiée"
            next_deadline = "Non spécifiée"
            additional_status = "Non spécifié"

            try:
                result_card = container.find_element(
                    By.CSS_SELECTOR, "sedia-result-card-type.eui-u-display-block.eui-u-mt-xs.ng-star-inserted"
                )

                # Get all <strong> elements with date values
                strongs = result_card.find_elements(By.CSS_SELECTOR, "strong.ng-star-inserted")
                if len(strongs) >= 1:
                    opening_date = strongs[0].text.strip()
                if len(strongs) >= 2:
                    next_deadline = strongs[1].text.strip()

                # Get the last <span> that is not a "|" separator
                spans = result_card.find_elements(By.CSS_SELECTOR, "span.ng-star-inserted")
                for span in reversed(spans):
                    span_text = span.text.strip()
                    if span_text and span_text != "|":
                        additional_status = span_text
                        break

            except:
                pass

            # --- Output Results ---
            if titre and href and href.startswith("http"):
                f.write(
                    f"Titre: {titre}\n"
                    f"Lien: {href}\n"
                    f"Statut: {status}\n"
                    f"Date d'ouverture: {opening_date}\n"
                    f"Date limite: {next_deadline}\n"
                    
                )
                print(
                    f"✔ {titre} | {href} | Statut: {status} | "
                    f"📅 Ouverture: {opening_date} → Deadline: {next_deadline} | Extra: {additional_status}"
                )








        # Try clicking the next page icon
        try:
            next_icon = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'eui-icon-svg[aria-label="Go to next page"]'))
            )

            # Check if it's disabled
            is_disabled = next_icon.get_attribute("aria-disabled")
            if is_disabled == "true":
                print("✅ Fin de la pagination (bouton désactivé).")
                break

            # Scroll into view and click using JavaScript
            driver.execute_script("arguments[0].scrollIntoView(true);", next_icon)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", next_icon)

            print("➡️ Passage à la page suivante...")
            time.sleep(3)

            # Optional cache cleanup
            driver.delete_all_cookies()
            driver.execute_script("window.localStorage.clear();")
            driver.execute_script("window.sessionStorage.clear();")

        except Exception as e:
            print(f"⚠️ Erreur lors de la tentative de passage à la page suivante : {e}")
            break

driver.quit()



# ============================================================================
# Cell 2 (execution_count: 18, id: 57725b9e)
# ============================================================================

import pandas as pd

def parse_project_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    data = []
    for i in range(0, len(lines), 5):
        data.append({
            "Title": lines[i].split(":", 1)[1].strip(),
            "Link": lines[i+1].split(":", 1)[1].strip(),
            "Status": lines[i+2].split(":", 1)[1].strip(),
            "Start_date": lines[i+3].split(":", 1)[1].strip(),
            "Deadline": lines[i+4].split(":", 1)[1].strip()
        })

    return pd.DataFrame(data)

df = parse_project_file("projets_EU_All.txt")
df.head()



# ============================================================================
# Cell 3 (execution_count: 19, id: 6f68d23a)
# ============================================================================

pd.set_option('display.max_colwidth', None)
print(df['Link'])


# ============================================================================
# Cell 4 (execution_count: 14, id: 2da9efd0)
# ============================================================================

df.head(15)


# ============================================================================
# Cell 5 (execution_count: 15, id: bf780b41)
# ============================================================================

df.info()


# ============================================================================
# Cell 6 (execution_count: 16, id: f1fec9c9)
# ============================================================================

df.shape


# ============================================================================
# Cell 7 (execution_count: 20, id: 5add94e4)
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
# Export en CSV
odf_df.to_csv("ODF_project_dataset.csv", index=False)



# ============================================================================
# Cell 8 (execution_count: 21, id: 1858b498)
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
# Cell 9 (execution_count: 22, id: 3a5dfa65)
# ============================================================================

all_keywords_text


# ============================================================================
# Cell 10 (execution_count: None, id: 77803cf3)
# ============================================================================

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

# === Configuration globale ===
# # options = Options()
# options.add_argument("--headless")
# options.add_argument("--disable-gpu")
# options.add_argument("--window-size=1920,1080")


def clean_text(text):
    lines = text.split("\n")
    cleaned_lines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 1]
    return "\n".join(cleaned_lines)

def analyze_url(url):
    local_driver = get_chrome_driver(headless=True)
    try:
        local_driver.get(url)

        # Attendre le contenu au lieu d'utiliser sleep
        try:
            WebDriverWait(local_driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.showMore--three-lines"))
            )
        except:
            pass

        # Scroll pour forcer le chargement
        for _ in range(5):
            local_driver.execute_script("window.scrollBy(0, 500);")
        
        # Récupération du texte
        js_code = """
        let desc = document.querySelector('div.showMore--three-lines');
        return desc ? desc.innerText.trim() : 'Pas de description de projet détectée.';
        """
        full_text = local_driver.execute_script(js_code)
        cleaned = clean_text(full_text)
        matched_keywords = [kw for kw in all_keywords_text if kw.lower() in cleaned.lower()]

        return {
            "URL": url,
            "Pertinence": "Yes" if matched_keywords else "No",
            "Matching Word(s)": ", ".join(matched_keywords) if matched_keywords else ""
        }

    except Exception as e:
        return {
            "URL": url,
            "Pertinence": "Error",
            "Matching Word(s)": str(e)
        }

    finally:
        local_driver.quit()

# === Lancer en parallèle ===
def run_parallel(df_links, max_workers=5):
    url_list = df_links['Link'].dropna().unique().tolist()
    results = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(analyze_url, url): url for url in url_list}
        for future in as_completed(future_to_url):
            results.append(future.result())

    return pd.DataFrame(results)


results = []
for url in df['Link']:
    print(f"Traitement : {url}")
    result = analyze_url(url)
    results.append(result)

# === Conversion en DataFrame final ===
df_final = pd.DataFrame(results)
df_final



# ============================================================================
# Cell 12 (execution_count: 22, id: d4d72d36)
# ============================================================================

df_yes = df_final[df_final["Pertinence"] == "Yes"]


# ============================================================================
# Cell 13 (execution_count: 23, id: d70bcb10)
# ============================================================================

resultsYES_df_keywords = pd.DataFrame(df_yes)
resultsYES_df_keywords.to_excel("resultats_pertinenceYES_keywords.xlsx", index=False)
print("\n✅ Résultats sauvegardés dans ''.")


# ============================================================================
# Cell 14 (execution_count: 8, id: d1b702dd)
# ============================================================================

import pandas as pd
df_yes=pd.read_excel("resultats_pertinenceYES_keywords.xlsx")


# ============================================================================
# Cell 15 (execution_count: 16, id: b4fedc2e)
# ============================================================================

df_yes[['Title', 'Status', 'Start_date', 'Deadline']] = df[['Title', 'Status', 'Start_date', 'Deadline']]



# ============================================================================
# Cell 16 (execution_count: None, id: 314dcab9)
# ============================================================================

df_yes_final = df_yes[df_yes['Pertinence'] == 'Yes'].copy()



# ============================================================================
# Cell 17 (execution_count: None, id: f58167e3)
# ============================================================================

df_yes_final


# ============================================================================
# Cell 18 (execution_count: 11, id: 65a6f378)
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

# === CONFIG SELENIUM HEADLESS ===
# # options = Options()
# options.add_argument("--headless")
# options.add_argument("--disable-gpu")
# options.add_argument("--window-size=1920,1080")
driver = get_chrome_driver(headless=True)

# === TEXT CLEANUP & LIMITING FUNCTION ===
def clean_and_limit_text(text, max_words=800):
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    if len(words) > max_words:
        return ' '.join(words[:max_words]) + " [...] (texte tronqué)"
    return text

# === Extraction texte depuis URL ===
def extract_text_from_url(url):
    try:
        driver.get(url)
        time.sleep(5)

        for _ in range(10):
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(0.3)
        time.sleep(5)

        js_code = """
        let desc = document.querySelector('div.showMore--three-lines');
        return desc ? desc.innerText.trim() : 'Pas de description de projet détectée.';
        """
        text = driver.execute_script(js_code)

        # Try also extracting UKRI accordion content
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

        full_text = f"{text}\n\n---\n\n{accordion_text}".strip()
        return full_text if full_text else "Pas de contenu détecté."

    except Exception as e:
        return f"Erreur Selenium: {e}"

# === Prompt pour Groq ===
def build_prompt(projects, site_text):
    projects_text = "\n".join([
        f"{i+1}. {p['Project Name']} : {p['Description']}, axe {p['Axes / Thematic Areas']}" 
        for i, p in enumerate(projects)
    ])
    return f"""
Tu es un expert en analyse de projets d'entreprise.

Voici une liste de projets que cette entreprise a déjà réalisés avec leurs descriptions et axes principaux :

{projects_text}

Voici maintenant le contenu d'un appel à projets spécifique extrait d'une page du portail européen :

{site_text}

Peux-tu me dire si cette opportunité est pertinente par rapport aux projets que l'entreprise a déjà réalisés ?  
Merci de répondre de façon claire :  
- Pertinence : Oui / Non  
- Projets similaires détectés : [liste]  
- Résumé rapide expliquant ta réponse.
"""

# === Requête à Groq ===
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

# === Analyse du résultat Groq ===
def parse_result(text):
    pertinence = "Inconnu"
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

# === Analyse d'une seule URL ===
def analyze_url(url, projects_list):
    print(f"🟡 Traitement : {url}")
    try:
        site_text_raw = extract_text_from_url(url)
        site_text = clean_and_limit_text(site_text_raw, max_words=800)
        projects_sample = projects_list[:3]  # Limiter à 3 projets
        prompt = build_prompt(projects_sample, site_text)
        result_text = query_groq(prompt)
        pertinence, resume = parse_result(result_text)

        return {
            "URL": url,
            "Pertinence LLM": pertinence,
            "Résumé LLM": resume,
            "Réponse brute": result_text
        }
    except Exception as e:
        return {
            "URL": url,
            "Pertinence LLM": "Erreur",
            "Résumé LLM": f"Erreur pendant l'analyse : {e}",
            "Réponse brute": str(e)
        }





# === MAIN ===
if __name__ == "__main__":
    from concurrent.futures import ThreadPoolExecutor, as_completed

    try:
        # Préparation des données
        projects_list = odf_df[['Project Name', 'Description', 'Axes / Thematic Areas']] \
            .dropna().to_dict(orient='records')
        url_list = df_yes['URL'].dropna().unique().tolist()

        # Exécution parallèle
        results = []
        max_workers = min(6, len(url_list))  # Ajustable selon ta machine
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_url = {
                executor.submit(analyze_url, url, projects_list): url for url in url_list
            }
            for future in tqdm(as_completed(future_to_url), total=len(future_to_url), desc="🔍 Analyse des URLs"):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"❌ Erreur avec l'URL {future_to_url[future]} : {e}")
                    results.append({'URL': future_to_url[future], 'Pertinence LLM': None, 'Résumé LLM': None})

        # Création du DataFrame des résultats
        results_df = pd.DataFrame(results)

        # Fusion avec les résultats existants
        df_final_llm = df_yes.merge(results_df, on="URL", how="left")

        # Sauvegarde
        df_final_llm.to_csv("df_yes_avec_pertinence_et_resume.csv", index=False)
        print("\n✅ Résultats enrichis sauvegardés dans 'df_yes_avec_pertinence_et_resume.csv'.")
        print(df_final_llm[['URL', 'Pertinence LLM', 'Résumé LLM']].head())

    except NameError:
        print("❌ Les DataFrames 'odf_df' et 'df_yes' doivent être définis avant l'exécution.")
    finally:
        driver.quit()



# ============================================================================
# Cell 19 (execution_count: 12, id: bd8263c3)
# ============================================================================

df_final_llm


# ============================================================================
# Cell 20 (execution_count: 13, id: c6695b14)
# ============================================================================

df_final_llm.to_excel("df_LLM_ALL_EU.xlsx", index=False)
    


# ============================================================================
# Cell 21 (execution_count: 32, id: f1fd7a28)
# ============================================================================


df_final_llm


# ============================================================================
# Cell 22 (execution_count: 3, id: 23d9c6f3)
# ============================================================================

df_final_llm.shape


# ============================================================================
# Cell 23 (execution_count: 14, id: dbfff143)
# ============================================================================

df_yes_final = df_final_llm[df_final_llm['Pertinence LLM'] == 'Oui'].copy()



# ============================================================================
# Cell 24 (execution_count: 38, id: 8d30abca)
# ============================================================================

df_yes_final.to_excel("df_LLM_YES_EU.xlsx", index=False)


# ============================================================================
# Cell 25 (execution_count: 15, id: 1c8fccaa)
# ============================================================================

df_yes_final


# ============================================================================
# Cell 26 (execution_count: None, id: 5c0fccc3)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 27 (execution_count: None, id: 006418ab)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 28 (execution_count: None, id: 80e2aee4)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 29 (execution_count: None, id: eb3d1ecb)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 30 (execution_count: None, id: 2bc831f7)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 31 (execution_count: None, id: cb15db15)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 32 (execution_count: None, id: 60ef413a)
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
def query_groq(prompt, model=MODEL_NAME, max_tokens=3000, temperature=1.0, stream=False, delay_between_requests=10):
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

        df_final_llm_uk.to_excel("df_yes_avec_pertinence_et_resume_uk.xlsx", index=False)
        print("\n✅ Résultats sauvegardés dans 'df_yes_avec_pertinence_et_resume_uk.csv'.")
        
    finally:
        driver.quit()



# ============================================================================
# Cell 33 (execution_count: None, id: 7558b594)
# ============================================================================

df_yes_final


# ============================================================================
# Cell 34 (execution_count: 39, id: ace6b2c4)
# ============================================================================

df_yes_final.shape


# ============================================================================
# Cell 35 (execution_count: None, id: 9dafffec)
# ============================================================================

df_yes_final.to_csv("df_yes_final.csv", index=True)
print("\n✅ Résultats enrichis sauvegardés dans 'df_yes_final.csv'.")


# ============================================================================
# Cell 36 (execution_count: None, id: 8e6ce914)
# ============================================================================

pd.set_option('display.max_colwidth', None)
print(df_yes_final['URL'])


# ============================================================================
# Cell 37 (execution_count: None, id: 073c50a2)
# ============================================================================

df_yes_final


# ============================================================================
# Cell 38 (execution_count: None, id: e56bbfa5)
# ============================================================================

df_yes_final.shape


# ============================================================================
# Cell 39 (execution_count: None, id: 84faa1b5)
# ============================================================================

print(df_yes_final.columns.tolist())



# ============================================================================
# Cell 40 (execution_count: None, id: 81b1e060)
# ============================================================================

df_yes_final.to_excel('df_final_yes.xlsx', index=False, engine='openpyxl')


