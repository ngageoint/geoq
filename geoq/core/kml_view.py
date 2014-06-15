from django.views.generic import ListView

from django.http import HttpResponse
from models import Job
from geoq.maps.models import FeatureType
from django.shortcuts import get_object_or_404


class JobKML(ListView):

    model = Job

    def get(self, request, *args, **kwargs):
        job = get_object_or_404(Job, pk=self.kwargs.get('pk'))

        locations = job.feature_set.all()
        feature_types = FeatureType.objects.all()

        aoi_count = job.aois.count()
        aoi_complete = job.complete().count()
        aoi_pct = int(100 * float(aoi_complete)/float(aoi_count))

        doc_name = 'GeoQ :: ['+str(aoi_complete)+'/'+str(aoi_count)+' '+str(aoi_pct)+'%] Job: '+str(job.name)
        description = 'Job #'+str(job.id)+', project: '+str(job.project.name)

        output = '<?xml version="1.0" encoding="UTF-8"?>\n'
        output += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        output += '  <Document>\n'
        output += '    <name>'+doc_name+'</name>\n'
        output += '    <description>'+description+'</description>\n'
        output += '    <Style id="geoq_inwork">\n'
        output += '      <LineStyle>\n'
        output += '        <width>3</width>\n'
        output += '        <color>7f00ffff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_complete">\n'
        output += '      <LineStyle>\n'
        output += '        <width>2</width>\n'
        output += '        <color>7f00ff00</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_unassigned">\n'
        output += '      <LineStyle>\n'
        output += '        <width>1</width>\n'
        output += '        <color>7f0000ff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        for feature in feature_types:
            output += '    <Style id="geoq_'+str(feature.id)+'">\n'
            if feature.style.has_key('weight'):
                output += '      <LineStyle>\n'
                output += '        <width>'+str(feature.style['weight'])+'</width>\n'
                output += '      </LineStyle>\n'

            if feature.style.has_key('color'):
                color = feature.style['color']
                #TODO: Maybe use webcolors and name_to_hex to convert color names to hex colors
                if color == 'orange':
                    color = '7fff6600' # NOTE: Using 50% transparency
                if color == 'red':
                    color = '7fff0000'
                if color == 'green':
                    color = '7f00ff00'
                if color == 'blue':
                    color = '7f0000ff'
                output += '      <PolyStyle>\n'
                output += '        <color>'+color+'</color>\n'
                output += '        <colorMode>normal</colorMode>\n'
                output += '        <fill>1</fill>\n'
                output += '        <outline>1</outline>\n'
                output += '      </PolyStyle>\n'

            if feature.style.has_key('iconUrl'):
                url = 'http://geo-q.com/'+str(feature.style['iconUrl'])
                output += '      <IconStyle>\n'
                output += '        <Icon>\n'
                output += '          <href>'+url+'</href>\n'
                output += '        </Icon>\n'
                output += '      </IconStyle>\n'
            output += '    </Style>\n'

        output += '   <Folder><name>Observations</name>\n'
        for loc in locations:
            template_name = loc.template.name
            analyst_name = loc.analyst.username
            dtg = str(loc.created_at)
            job_id = str(loc.job.id)
            desc = 'Posted by '+str(analyst_name)+'\n at '+dtg+'\n in Job #'+job_id
            #TODO: Add links to Jobs and Projects

            output += '    <Placemark><name>'+str(template_name)+'</name>\n'
            output += '    <description>'+desc+'</description>\n'
            output += '      <styleUrl>#geoq_'+str(loc.template.id)+'</styleUrl>\n'
            output += '      '+str(loc.the_geom.kml)+'\n'
            output += '    </Placemark>\n'

        output += '   </Folder>\n'
        output += '   <Folder><name>Work Cells</name>\n'
        for aoi in job.aois.all():
            style = 'complete'
            if aoi.status == 'In work':
                style = 'inwork'
            if aoi.status == 'Unassigned':
                style = 'unassigned'
            output += '    <Placemark>\n'
            output += '      <styleUrl>#geoq_'+style+'</styleUrl>\n'
            output += '      '+str(aoi.polygon.kml)+'\n'
            output += '    </Placemark>\n'

        output += '   </Folder>\n'
        output += '  </Document>\n'
        output += '</kml>'

        return HttpResponse(output, mimetype="application/vnd.google-earth.kml+xml", status=200)
